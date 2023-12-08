import { Router } from 'express';

import { authMiddleware } from '@src/middlewares';

import { handleResponse } from '@utils/index';

import { AddressBookService } from '../addressBook/services';
import { UserService } from '../configs/user/service';
import { NotificationService } from '../notification/services';
import { TransactionService } from '../transaction/services';
import { PredicateController } from './controller';
import { PredicateService } from './services';
import { validateAddPredicatePayload } from './validations';

const router = Router();
const predicateService = new PredicateService();
const addressBookService = new AddressBookService();
const userService = new UserService();
const transactionService = new TransactionService();
const notificationService = new NotificationService();
const {
  create,
  findById,
  list,
  findByAddress,
  delete: deleteService,
} = new PredicateController(
  userService,
  predicateService,
  addressBookService,
  transactionService,
  notificationService,
);

router.use(authMiddleware);

router.post('/', validateAddPredicatePayload, handleResponse(create));
router.get('/', handleResponse(list));
router.get('/:id', handleResponse(findById));
//router.get('/reserved-coins/:address', handleResponse(hasReservedCoins));
router.get('/by-address/:address', handleResponse(findByAddress));
//router.delete('/:id', handleResponse(deleteService));

export default router;
