import { Router } from 'express';

import { handleResponse } from '@src/utils';

import { PredicateService } from '../predicate/services';
import { NotificationService } from '../notification/services';
import { PredicateController } from '../predicate/controller';

const router = Router();
const predicateService = new PredicateService();
const notificationsService = new NotificationService();
const { listAll } = new PredicateController(predicateService, notificationsService);

router.get('/predicate', handleResponse(listAll));

export default router;
