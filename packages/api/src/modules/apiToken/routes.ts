import { Router } from 'express';
import { authMiddleware, authPermissionMiddleware } from '@src/middlewares';
import { PermissionRoles } from '@src/models';
import { APITokenController } from '@modules/apiToken/controller';
import { handleResponse } from '@src/utils';
import { APITokenService } from '@modules/apiToken/service';
import { PredicateService } from '@modules/predicate/services';
import { validateCreateAPITokenPayload } from '@modules/apiToken/validations';

const router = Router();

const { create } = new APITokenController(
  new APITokenService(),
  new PredicateService(),
);

router.use(authMiddleware);
router.use(
  authPermissionMiddleware([
    PermissionRoles.OWNER,
    PermissionRoles.ADMIN,
    PermissionRoles.MANAGER,
  ]),
);

router.post('/:predicateId', validateCreateAPITokenPayload, handleResponse(create));
router.get('/:predicateId');

export default router;
