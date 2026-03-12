import { Router } from 'express';

import { externAuthMiddleware } from '@src/middlewares';
import { handleResponse } from '@src/utils';

import { AddressBookService } from '../addressBook/services';
import { NotificationService } from '../notification/services';
import { PredicateController } from '../predicate/controller';
import { PredicateService } from '../predicate/services';
import { QuoteController } from '../quote/controller';
import { QuoteService } from '../quote/services';
import { TransactionController } from '../transaction/controller';
import { TransactionService } from '../transaction/services';
import { UserController } from '../user/controller';
import { UserService } from '../user/service';

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
const userController = new UserController(userService, txService);
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
