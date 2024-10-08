import { Router } from 'express';

import { authMiddleware, authPermissionMiddleware } from '@src/middlewares';
import { PermissionRoles } from '@src/models/Workspace';

import { handleResponse } from '@utils/index';

import { NotificationService } from '../notification/services';
import { TransactionService } from '../transaction/services';
import { UserService } from '../user/service';
import { PredicateController } from './controller';
import { PredicateService } from './services';
import { validateAddPredicatePayload } from './validations';
import { PredicateVersionService } from '../predicateVersion/services';

const router = Router();
const predicateService = new PredicateService();
const notificationsService = new NotificationService();
const {
  create,
  findById,
  findByName,
  list,
  findByAddress,
  delete: deleteService,
  hasReservedCoins,
  checkByAddress,
} = new PredicateController(predicateService, notificationsService);

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
router.get('/:predicateId', handleResponse(findById));
router.get('/by-name/:name', handleResponse(findByName));
router.get('/reserved-coins/:predicateId', handleResponse(hasReservedCoins));
router.get('/by-address/:address', handleResponse(findByAddress));
router.get('/check/by-address/:address', handleResponse(checkByAddress));

export default router;
