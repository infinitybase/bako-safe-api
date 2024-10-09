import { Router } from 'express';

import {
  authMiddleware,
  authPermissionMiddleware,
  predicatePermissionMiddleware,
} from '@src/middlewares';
import { PermissionRoles } from '@src/models/Workspace';

import { handleResponse } from '@utils/index';

import { NotificationService } from '../notification/services';

import { PredicateController } from './controller';
import { PredicateService } from './services';
import { validateAddPredicatePayload } from './validations';

const permissionMiddlewareById = predicatePermissionMiddleware({
  predicateSelector: req => ({
    id: req.params.predicateId,
  }),
});

const permissionMiddlewareByAddress = predicatePermissionMiddleware({
  predicateSelector: req => ({
    predicateAddress: req.params.address,
  }),
});

const router = Router();
const predicateService = new PredicateService();
const notificationsService = new NotificationService();
const {
  create,
  findById,
  findByName,
  list,
  findByAddress,
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
router.get('/:predicateId', permissionMiddlewareById, handleResponse(findById));
router.get('/by-name/:name', handleResponse(findByName));
router.get(
  '/reserved-coins/:predicateId',
  permissionMiddlewareById,
  handleResponse(hasReservedCoins),
);
router.get(
  '/by-address/:address',
  permissionMiddlewareByAddress,
  handleResponse(findByAddress),
);
router.get('/check/by-address/:address', handleResponse(checkByAddress));

export default router;
