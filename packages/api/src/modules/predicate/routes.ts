import { Router } from 'express';

import { authMiddleware, predicatePermissionMiddleware } from '@src/middlewares';
import { PermissionRoles } from '@src/models/Workspace';

import { handleResponse } from '@utils/index';

import { NotificationService } from '../notification/services';

import { PredicateController } from './controller';
import { PredicateService } from './services';
import {
  validateAddPredicatePayload,
  validatePredicateIdParams,
  validateTooglePredicatePayload,
} from './validations';

const permissionMiddlewareById = predicatePermissionMiddleware({
  predicateSelector: req => ({
    id: req.params.predicateId,
  }),
  permissions: [PermissionRoles.OWNER, PermissionRoles.SIGNER],
});

const permissionMiddlewareByAddress = predicatePermissionMiddleware({
  predicateSelector: req => ({
    predicateAddress: req.params.address,
  }),
  permissions: [PermissionRoles.OWNER, PermissionRoles.SIGNER],
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
  tooglePredicateVisibility,
} = new PredicateController(predicateService, notificationsService);

router.use(authMiddleware);

router.post('/', validateAddPredicatePayload, handleResponse(create));
router.get('/', handleResponse(list));
router.get(
  '/:predicateId',
  validatePredicateIdParams,
  permissionMiddlewareById,
  handleResponse(findById),
);
router.get('/by-name/:name', handleResponse(findByName));
router.get(
  '/reserved-coins/:predicateId',
  validatePredicateIdParams,
  permissionMiddlewareById,
  handleResponse(hasReservedCoins),
);
router.get(
  '/by-address/:address',
  permissionMiddlewareByAddress,
  handleResponse(findByAddress),
);
router.get('/check/by-address/:address', handleResponse(checkByAddress));
router.post(
  '/toggle-predicate',
  validateTooglePredicatePayload,
  handleResponse(tooglePredicateVisibility),
);
export default router;
