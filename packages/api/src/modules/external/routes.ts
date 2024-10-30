import { Router } from 'express';

import { handleResponse } from '@src/utils';
import { externAuthMiddleware } from '@src/middlewares';

import { PredicateService } from '../predicate/services';
import { NotificationService } from '../notification/services';
import { PredicateController } from '../predicate/controller';
import { QuoteController } from '../quote/controller';
import { QuoteService } from '../quote/services';

const router = Router();
const predicateService = new PredicateService();
const notificationsService = new NotificationService();
const quoteService = new QuoteService();

const predicateContoller = new PredicateController(
  predicateService,
  notificationsService,
);
const quoteController = new QuoteController(quoteService);

router.get(
  '/predicate',
  externAuthMiddleware,
  handleResponse(predicateContoller.listAll),
);
router.get('/quote', externAuthMiddleware, handleResponse(quoteController.listAll));

export default router;
