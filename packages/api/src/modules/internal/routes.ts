import { Router, Request, Response, NextFunction } from 'express';
import { logger } from '@src/config/logger';
import App from '@src/server/app';
import { CacheMetrics } from '@src/config/cache';

const internalRouter = Router();

// Internal API Key for protected endpoints
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

/**
 * Middleware to protect internal endpoints
 * Requires X-API-Key header matching INTERNAL_API_KEY env var
 * If INTERNAL_API_KEY is not set, endpoints are unprotected (development mode)
 */
const requireApiKey = (req: Request, res: Response, next: NextFunction) => {
  if (!INTERNAL_API_KEY) {
    // No API key configured - allow access (development mode)
    logger.warn('[INTERNAL] No INTERNAL_API_KEY configured, allowing access');
    return next();
  }

  const apiKey = req.headers['x-api-key'];

  if (apiKey !== INTERNAL_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }

  next();
};

/**
 * GET /internal/cache/stats
 * Returns cache statistics and metrics
 */
internalRouter.get('/cache/stats', requireApiKey, async (_req, res) => {
  try {
    const balanceCache = App.getInstance()._balanceCache;
    const stats = await balanceCache.stats();

    return res.json({
      success: true,
      data: stats,
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error({ error: error }, '[INTERNAL] cache/stats error:');
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /internal/cache/keys
 * Returns cache keys matching a pattern (for debugging)
 * Query params:
 * - pattern: Redis pattern (default: balance:*)
 */
internalRouter.get('/cache/keys', requireApiKey, async (req, res) => {
  try {
    const pattern = (req.query.pattern as string) || 'balance:*';
    const balanceCache = App.getInstance()._balanceCache;
    const keys = await balanceCache.keys(pattern);

    return res.json({
      success: true,
      data: {
        pattern,
        count: keys.length,
        keys: keys.slice(0, 100), // Limit to 100 keys
        truncated: keys.length > 100,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error({ error: error }, '[INTERNAL] cache/keys error');
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /internal/cache/invalidate
 * Invalidate cache with various filters
 * Body:
 * - predicateAddress: string (optional) - Invalidate specific predicate
 * - chainId: number (optional) - Invalidate specific chainId (requires predicateAddress)
 * - userId: string (optional) - Invalidate all predicates for a user
 * - workspaceId: string (optional) - Invalidate all predicates in a workspace
 * - all: boolean (optional) - Invalidate ALL cache (use with caution!)
 */
internalRouter.post('/cache/invalidate', requireApiKey, async (req, res) => {
  try {
    const { predicateAddress, chainId, userId, workspaceId, all } = req.body;
    const balanceCache = App.getInstance()._balanceCache;

    let invalidatedCount = 0;
    let message = '';

    // Option 1: Invalidate ALL (dangerous!)
    if (all === true) {
      invalidatedCount = await balanceCache.invalidateAll();
      message = `Invalidated all cache (${invalidatedCount} keys)`;
    }
    // Option 2: Invalidate by predicate address
    else if (predicateAddress) {
      await balanceCache.invalidate(predicateAddress, chainId);
      invalidatedCount = 1;
      message = chainId
        ? `Invalidated ${predicateAddress} for chainId ${chainId}`
        : `Invalidated ${predicateAddress} for all chains`;
    }
    // Option 3: Invalidate by userId
    else if (userId) {
      // Import dynamically to avoid circular dependencies
      const { Predicate } = await import('@src/models');

      invalidatedCount = await balanceCache.invalidateByUser(userId, async () => {
        const predicates = await Predicate.createQueryBuilder('predicate')
          .innerJoin('predicate.members', 'member')
          .where('member.id = :userId', { userId })
          .select(['predicate.predicateAddress'])
          .getMany();
        return predicates.map(p => p.predicateAddress);
      });
      message = `Invalidated ${invalidatedCount} predicates for user ${userId}`;
    }
    // Option 4: Invalidate by workspaceId
    else if (workspaceId) {
      const { Predicate } = await import('@src/models');

      const predicates = await Predicate.find({
        where: { workspace: { id: workspaceId } },
        select: ['predicateAddress'],
      });

      for (const predicate of predicates) {
        await balanceCache.invalidate(predicate.predicateAddress);
        invalidatedCount++;
      }
      message = `Invalidated ${invalidatedCount} predicates for workspace ${workspaceId}`;
    } else {
      return res.status(400).json({
        success: false,
        error:
          'Missing required parameter: predicateAddress, userId, workspaceId, or all',
      });
    }

    logger.info({ message }, '[INTERNAL] cache/invalidate');

    return res.json({
      success: true,
      data: {
        invalidatedCount,
        message,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error({ error: error }, '[INTERNAL] cache/invalidate error');
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /internal/cache/warmup
 * Manually trigger cache warmup for a user
 * Body:
 * - userId: string (required)
 * - networkUrl: string (required)
 */
internalRouter.post('/cache/warmup', requireApiKey, async (req, res) => {
  try {
    const { userId, networkUrl } = req.body;

    if (!userId || !networkUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: userId, networkUrl',
      });
    }

    // Import dynamically to avoid circular dependencies
    const { Predicate } = await import('@src/models');
    const { FuelProvider } = await import('@src/utils');

    // Get user's predicates using query builder for ManyToMany relation
    const predicates = await Predicate.createQueryBuilder('predicate')
      .innerJoin('predicate.members', 'member')
      .where('member.id = :userId', { userId })
      .select(['predicate.predicateAddress'])
      .getMany();

    if (predicates.length === 0) {
      return res.json({
        success: true,
        data: {
          warmedUp: 0,
          message: `No predicates found for user ${userId}`,
        },
        timestamp: Date.now(),
      });
    }

    // Get provider and warm up cache
    const provider = await FuelProvider.create(networkUrl);
    let warmedUp = 0;
    const errors: string[] = [];

    for (const predicate of predicates) {
      try {
        await provider.getBalances(predicate.predicateAddress);
        warmedUp++;
      } catch (err) {
        errors.push(
          `${predicate.predicateAddress}: ${
            err instanceof Error ? err.message : 'Unknown error'
          }`,
        );
      }
    }

    CacheMetrics.warmup(warmedUp);

    return res.json({
      success: true,
      data: {
        total: predicates.length,
        warmedUp,
        errors: errors.length > 0 ? errors : undefined,
        message: `Warmed up ${warmedUp}/${predicates.length} predicates`,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error({ error: error }, '[INTERNAL] cache/warmup error');
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /internal/cache/metrics/reset
 * Reset cache metrics (for testing)
 */
internalRouter.post('/cache/metrics/reset', requireApiKey, async (_req, res) => {
  try {
    await CacheMetrics.reset();

    return res.json({
      success: true,
      message: 'Cache metrics reset',
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error({ error: error }, '[INTERNAL] cache/metrics/reset error');
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /internal/health
 * Simple health check for internal services
 */
internalRouter.get('/health', (_req, res) => {
  return res.json({
    success: true,
    status: 'healthy',
    timestamp: Date.now(),
  });
});

export { internalRouter };
