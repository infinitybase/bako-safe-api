import { Router } from 'express';

import { handleResponse } from '@src/utils';
import { externAuthMiddleware } from '@src/middlewares';

import { PredicateService } from '../predicate/services';
import { NotificationService } from '../notification/services';
import { PredicateController } from '../predicate/controller';
import { QuoteController } from '../quote/controller';
import { QuoteService } from '../quote/services';
import { UserController } from '../user/controller';
import { UserService } from '../user/service';
import { TransactionService } from '../transaction/services';
import { TransactionController } from '../transaction/controller';
import { AddressBookService } from '../addressBook/services';

const router = Router();

const predicateService = new PredicateService();
const notificationsService = new NotificationService();
const quoteService = new QuoteService();
const userService = new UserService();
const txService = new TransactionService();
const addressbookService = new AddressBookService();

const predicateContoller = new PredicateController(
  predicateService,
  notificationsService,
);
const quoteController = new QuoteController(quoteService);
const userController = new UserController(userService);
const txController = new TransactionController(
  txService,
  predicateService,
  addressbookService,
  notificationsService,
);

router.use(externAuthMiddleware);

router.get('/predicate', handleResponse(predicateContoller.listAll));
router.get('/user', handleResponse(userController.listAll));
router.get('/quote', handleResponse(quoteController.listAll));
router.get('/tx', handleResponse(txController.listAll));

export default router;
