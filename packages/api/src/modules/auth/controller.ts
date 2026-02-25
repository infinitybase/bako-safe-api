import { addMinutes } from 'date-fns';
import { logger } from '@src/config/logger';
import { Address } from 'fuels';

import { RecoverCodeType, User } from '@src/models';
import GeneralError, { ErrorTypes } from '@src/utils/error/GeneralError';

import { NotFound, error } from '@utils/error';
import { Responses, successful, bindMethods, TokenUtils } from '@utils/index';

import { RecoverCodeService } from '../recoverCode/services';

import { IAuthService, ICreateRecoverCodeRequest, ISignInRequest } from './types';
import App from '@src/server/app';
import { Request } from 'express';
import { FuelProvider } from '@src/utils';
import { cacheConfig, CacheMetrics } from '@src/config/cache';
import { Predicate } from '@src/models';
import { networksByChainId } from '@src/constants/networks';

const { FUEL_PROVIDER } = process.env;

// All networks to warmup on login
const WARMUP_NETWORKS = Object.values(networksByChainId);

/**
 * Simple concurrency limiter for warmup requests
 */
function createConcurrencyLimiter(concurrency: number) {
  let running = 0;
  const queue: (() => void)[] = [];

  const next = () => {
    if (running < concurrency && queue.length > 0) {
      running++;
      const fn = queue.shift();
      fn?.();
    }
  };

  return async <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
      const run = async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (err) {
          reject(err);
        } finally {
          running--;
          next();
        }
      };

      queue.push(run);
      next();
    });
  };
}

export class AuthController {
  private authService: IAuthService;

  constructor(authService: IAuthService) {
    this.authService = authService;
    bindMethods(this);
  }

  async signIn(req: ISignInRequest) {
    try {
      const { digest, encoder, signature, userAddress, name } = req.body;
      const userFilter = userAddress
        ? { address: new Address(userAddress).toB256() }
        : { name };

      const { userToken, signin } = await TokenUtils.createAuthToken(
        signature,
        digest,
        encoder,
        userFilter,
      );

      await App.getInstance()._sessionCache.addSession(
        userToken.accessToken,
        userToken,
      );

      // Note: warmup is triggered earlier in generateSignCode
      // so cache should already be ready by the time user signs in

      return successful(signin, Responses.Ok);
    } catch (e) {
      if (e instanceof GeneralError) throw e;

      return error(e.error, e.statusCode);
    }
  }

  /**
   * Pre-warm balance cache for user's most recently used predicates
   * Runs in background to not block login response
   *
   * Optimizations:
   * - Orders by updatedAt (most recently used first)
   * - Limits to maxPredicates (default 20)
   * - Skips predicates already in cache
   * - Uses global chainId cache
   */
  private async warmupUserBalances(
    userId: string,
    networkUrl?: string,
  ): Promise<void> {
    if (!userId || !networkUrl) {
      logger.info('[WARMUP] Skipped: missing userId or networkUrl');
      return;
    }

    try {
      const startTime = Date.now();
      const userIdShort = userId.slice(0, 8);

      // Get chainId from global cache (avoids extra RPC call)
      const chainId = await FuelProvider.getChainId(networkUrl);

      // Get user's predicates (members + personal account) ordered by most recently used
      const predicates = await Predicate.createQueryBuilder('predicate')
        .leftJoin('predicate.members', 'member')
        .leftJoin('predicate.owner', 'owner')
        .where(
          'member.id = :userId OR (owner.id = :userId AND predicate.root = true)',
          { userId },
        )
        .select(['predicate.predicateAddress'])
        .orderBy('predicate.updatedAt', 'DESC')
        .limit(cacheConfig.warmup.maxPredicates)
        .getMany();

      if (predicates.length === 0) {
        logger.info({ userId }, '[WARMUP] No predicates found for user');
        return;
      }

      const addresses = predicates.map(p => p.predicateAddress);

      // Filter out already cached predicates (if skipIfCached is enabled)
      let addressesToWarmup = addresses;
      if (cacheConfig.warmup.skipIfCached) {
        const balanceCache = App.getInstance()._balanceCache;
        addressesToWarmup = await balanceCache.filterUncached(addresses, chainId);

        if (addressesToWarmup.length === 0) {
          logger.info(
            { userId, addressesLength: addresses.length },
            '[WARMUP] All predicates already cached for user',
          );
          return;
        }

        logger.info(
          {
            userId,
            addressesToWarmupCount: addressesToWarmup.length,
            addressesCount: addresses.length,
          },
          '[WARMUP] Some predicates need warming for user',
        );
      } else {
        logger.info(
          { userId: userIdShort, addressesCount: addresses.length },
          '[WARMUP] Warming predicates for user',
        );
      }

      // Get provider
      const provider = await FuelProvider.create(networkUrl);

      // Use rate limiting for concurrent requests
      const limit = createConcurrencyLimiter(cacheConfig.warmup.concurrency);

      const results = await Promise.allSettled(
        addressesToWarmup.map(address =>
          limit(async () => {
            try {
              await provider.getBalances(address);
              return { success: true, address };
            } catch (err) {
              return {
                success: false,
                address,
                error: err instanceof Error ? err.message : 'Unknown error',
              };
            }
          }),
        ),
      );

      const successCount = results.filter(
        r => r.status === 'fulfilled' && r.value.success,
      ).length;

      CacheMetrics.warmup(successCount);

      const elapsed = Date.now() - startTime;
      logger.info(
        {
          userId: userIdShort,
          successCount,
          addressesToWarmupCount: addressesToWarmup.length,
          elapsed,
        },
        '[WARMUP] User predicates warmed',
      );
    } catch (error) {
      logger.error({ error: error }, '[WARMUP]');
    }
  }

  async signOut(req: Request) {
    try {
      const token = req?.headers?.authorization;

      if (token) {
        await App.getInstance()._sessionCache.removeSession(token);
      }

      return successful(true, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }

  async generateSignCode(req: ICreateRecoverCodeRequest) {
    try {
      const { name, networkUrl } = req.body;
      const { origin } = req.headers ?? { origin: 'no-agent' };
      const owner = await User.findOne({ where: { name } });

      if (!owner) {
        throw new NotFound({
          type: ErrorTypes.NotFound,
          title: 'User not found',
          detail: `User not found`,
        });
      }

      const provider = await FuelProvider.create(networkUrl ?? FUEL_PROVIDER);

      const response = await new RecoverCodeService().create({
        owner,
        type: RecoverCodeType.AUTH,
        origin: origin ?? process.env.UI_URL,
        validAt: addMinutes(new Date(), 5),
        network: {
          url: provider.url,
          chainId: await provider.getChainId(),
        },
      });

      // Trigger warm-up early for ALL networks (when code is generated, before user signs)
      // This way cache is ready when user completes login, regardless of which network they use
      if (cacheConfig.warmup.enabled) {
        Promise.all(
          WARMUP_NETWORKS.map(networkUrl =>
            this.warmupUserBalances(owner.id, networkUrl).catch(err =>
              logger.error(
                { newtork: networkUrl, error: err },
                `[WARMUP] Failed for network`,
              ),
            ),
          ),
        );
      }

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }
}
