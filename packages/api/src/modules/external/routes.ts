import { Router } from 'express';

import { handleResponse } from '@src/utils';
import { externAuthMiddleware } from '@src/middlewares';

import { PredicateService } from '../predicate/services';
import { NotificationService } from '../notification/services';
import { PredicateController } from '../predicate/controller';

const router = Router();
const predicateService = new PredicateService();
const notificationsService = new NotificationService();
const { listAll } = new PredicateController(predicateService, notificationsService);

router.get('/predicate', externAuthMiddleware, handleResponse(listAll));

export default router;
