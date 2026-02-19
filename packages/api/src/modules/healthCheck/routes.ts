import { Router } from 'express';
import { HealthCheckController } from './controller';
import { handleResponse } from '@src/utils';
import { HealthCheckService } from './service';

const router = Router();

const healthCheckService = new HealthCheckService();
const { checkDatabase, checkRedis } = new HealthCheckController(healthCheckService);

// API health check
router.get('/', (_, res) => res.status(200).send({ status: 'ok' }));

// Database health check
router.get('/db', handleResponse(checkDatabase));

// Redis health check
router.get('/redis', handleResponse(checkRedis));

export default router;
