import { Router } from 'express';

import { authMiddleware } from '@src/middlewares';

import { handleResponse } from '@utils/index';

import { NotificationController } from './controller';
import { NotificationService } from './services';

const router = Router();
const notificationService = new NotificationService();
const { readAll, list } = new NotificationController(notificationService);

router.use(authMiddleware);

router.get('/', handleResponse(list));
router.put('/read-all', handleResponse(readAll));

export default router;
