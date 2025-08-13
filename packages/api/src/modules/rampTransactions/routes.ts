import { authMiddleware } from '@src/middlewares';
import { handleResponse } from '@src/utils';
import { Router } from 'express';
import RampTransactionsController from './controller';
import RampTransactionsService from './service';

const service = new RampTransactionsService();
const controller = new RampTransactionsController(service);

const router = Router();

router.use(authMiddleware);

router.get('/:id', handleResponse(controller.findById));

export default router;
