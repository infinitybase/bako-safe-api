import { addMinutes } from 'date-fns';
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

const { FUEL_PROVIDER } = process.env;

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

      // Trigger warm-up in background (don't await)
      if (cacheConfig.warmup.enabled) {
        this.warmupUserBalances(signin.user_id, signin.network?.url).catch(
          err => console.error('[WARMUP] Failed:', err),
        );
      }

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
      console.log('[WARMUP] Skipped: missing userId or networkUrl');
      return;
    }

    try {
      const startTime = Date.now();
      const userIdShort = userId.slice(0, 8);

      // Get chainId from global cache (avoids extra RPC call)
      const chainId = await FuelProvider.getChainId(networkUrl);

      // Get user's predicates ordered by most recently used, limited
      const predicates = await Predicate.createQueryBuilder('predicate')
        .innerJoin('predicate.members', 'member')
        .where('member.id = :userId', { userId })
        .select(['predicate.predicateAddress'])
        .orderBy('predicate.updatedAt', 'DESC')
        .limit(cacheConfig.warmup.maxPredicates)
        .getMany();

      if (predicates.length === 0) {
        console.log(`[WARMUP] No predicates found for user ${userIdShort}...`);
        return;
      }

      const addresses = predicates.map(p => p.predicateAddress);

      // Filter out already cached predicates (if skipIfCached is enabled)
      let addressesToWarmup = addresses;
      if (cacheConfig.warmup.skipIfCached) {
        const balanceCache = App.getInstance()._balanceCache;
        addressesToWarmup = await balanceCache.filterUncached(addresses, chainId);

        if (addressesToWarmup.length === 0) {
          console.log(
            `[WARMUP] User ${userIdShort}: All ${addresses.length} predicates already cached`,
          );
          return;
        }

        console.log(
          `[WARMUP] User ${userIdShort}: ${addressesToWarmup.length}/${addresses.length} need warming`,
        );
      } else {
        console.log(
          `[WARMUP] User ${userIdShort}: Warming ${addresses.length} predicates`,
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
      console.log(
        `[WARMUP] User ${userIdShort}: ${successCount}/${addressesToWarmup.length} warmed in ${elapsed}ms`,
      );
    } catch (error) {
      console.error('[WARMUP] Error:', error);
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

      return successful(response, Responses.Ok);
    } catch (e) {
      return error(e.error, e.statusCode);
    }
  }
}
