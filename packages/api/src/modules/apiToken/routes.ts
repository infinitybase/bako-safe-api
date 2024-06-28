import { Router } from 'express';
import { authMiddleware, predicatePermissionMiddleware } from '@src/middlewares';
import { PermissionRoles } from '@src/models';
import { APITokenController } from '@modules/apiToken/controller';
import { handleResponse } from '@src/utils';
import { APITokenService } from '@modules/apiToken/service';
import { PredicateService } from '@modules/predicate/services';
import {
  validateCreateAPITokenParams,
  validateCreateAPITokenPayload,
  validateDeleteAPITokenParams,
} from '@modules/apiToken/validations';

const router = Router();

const { create, delete: deleteAPIToken } = new APITokenController(
  new APITokenService(),
  new PredicateService(),
);

router.use(authMiddleware);

router.post(
  '/:predicateId',
  validateCreateAPITokenParams,
  validateCreateAPITokenPayload,
  predicatePermissionMiddleware({
    permissions: [
      PermissionRoles.OWNER,
      PermissionRoles.ADMIN,
      PermissionRoles.MANAGER,
    ],
    predicateSelector: req => req.params.predicateId,
  }),
  handleResponse(create),
);

router.delete(
  '/:predicateId/:id',
  validateDeleteAPITokenParams,
  predicatePermissionMiddleware({
    permissions: [
      PermissionRoles.OWNER,
      PermissionRoles.ADMIN,
      PermissionRoles.MANAGER,
    ],
    predicateSelector: req => req.params.predicateId,
  }),
  handleResponse(deleteAPIToken),
);

export default router;
