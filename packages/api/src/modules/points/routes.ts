import { Router } from 'express';

import { authMiddleware } from '@src/middlewares';

import { handleResponse } from '@utils/index';

import { PointsService } from './service';
import { PointsController } from './controller';

const router = Router();
const pointsService = new PointsService();
const { score } = new PointsController(pointsService);

router.use(authMiddleware);

router.get('/score', handleResponse(score));

export default router;
