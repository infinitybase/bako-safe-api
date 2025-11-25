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
   * Pre-warm balance cache for all user's predicates
   * Runs in background to not block login response
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
      console.time(`[WARMUP] User ${userId.slice(0, 8)}...`);

      // Get user's predicates using query builder for ManyToMany relation
      const predicates = await Predicate.createQueryBuilder('predicate')
        .innerJoin('predicate.members', 'member')
        .where('member.id = :userId', { userId })
        .select(['predicate.predicateAddress'])
        .getMany();

      if (predicates.length === 0) {
        console.log(`[WARMUP] No predicates found for user ${userId.slice(0, 8)}...`);
        return;
      }

      console.log(
        `[WARMUP] Found ${predicates.length} predicates, fetching balances...`,
      );

      // Get provider
      const provider = await FuelProvider.create(networkUrl);

      // Use rate limiting for concurrent requests
      const limit = createConcurrencyLimiter(cacheConfig.warmup.concurrency);

      const results = await Promise.allSettled(
        predicates.map(predicate =>
          limit(async () => {
            try {
              await provider.getBalances(predicate.predicateAddress);
              return { success: true, address: predicate.predicateAddress };
            } catch (err) {
              return {
                success: false,
                address: predicate.predicateAddress,
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

      console.timeEnd(`[WARMUP] User ${userId.slice(0, 8)}...`);
      console.log(`[WARMUP] Success: ${successCount}/${predicates.length}`);
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
