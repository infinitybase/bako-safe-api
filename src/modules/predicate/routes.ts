import { Router } from 'express';

import { authMiddleware, authPermissionMiddleware } from '@src/middlewares';
import { PermissionRoles } from '@src/models/Workspace';

import { handleResponse } from '@utils/index';

import { AddressBookService } from '../addressBook/services';
import { NotificationService } from '../notification/services';
import { TransactionService } from '../transaction/services';
import { UserService } from '../user/service';
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
  hasReservedCoins,
} = new PredicateController(
  userService,
  predicateService,
  addressBookService,
  transactionService,
  notificationService,
);

router.use(authMiddleware);

router.post(
  '/',
  validateAddPredicatePayload,
  authPermissionMiddleware([
    PermissionRoles.OWNER,
    PermissionRoles.ADMIN,
    PermissionRoles.MANAGER,
  ]),
  handleResponse(create),
);
router.get('/', handleResponse(list));
router.get('/:id', handleResponse(findById));
router.get('/reserved-coins/:address', handleResponse(hasReservedCoins));
router.get('/by-address/:address', handleResponse(findByAddress));
//router.delete('/:id', handleResponse(deleteService));

export default router;
