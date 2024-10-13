import { Router } from 'express';
import { authMiddleware, predicatePermissionMiddleware } from '@src/middlewares';
import { PermissionRoles } from '@src/models';
import { APITokenController } from '@modules/apiToken/controller';
import { handleResponse } from '@src/utils';
import { APITokenService } from '@modules/apiToken/service';
import { PredicateService } from '@modules/predicate/services';
import {
  validateCLIAuthPayload,
  validateCreateAPITokenParams,
  validateCreateAPITokenPayload,
  validateDeleteAPITokenParams,
  validateListAPITokenParams,
} from '@modules/apiToken/validations';

const router = Router();
const cliAuthRoute = Router();

const permissionMiddleware = predicatePermissionMiddleware({
  permissions: [
    PermissionRoles.OWNER,
    PermissionRoles.ADMIN,
    PermissionRoles.MANAGER,
  ],
  predicateSelector: req => req.params.predicateId,
});

const { auth, create, list, delete: deleteAPIToken } = new APITokenController(
  new APITokenService(),
  new PredicateService(),
);

router.use(authMiddleware);

router.post(
  '/:predicateId',
  validateCreateAPITokenParams,
  validateCreateAPITokenPayload,
  permissionMiddleware,
  handleResponse(create),
);

router.delete(
  '/:predicateId/:id',
  validateDeleteAPITokenParams,
  permissionMiddleware,
  handleResponse(deleteAPIToken),
);

router.get(
  '/:predicateId',
  validateListAPITokenParams,
  permissionMiddleware,
  handleResponse(list),
);

cliAuthRoute.post('/auth', validateCLIAuthPayload, handleResponse(auth));

export { cliAuthRoute };
export default router;
