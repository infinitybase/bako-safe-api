import { Router } from 'express';

import { authMiddleware, authPermissionMiddleware } from '@src/middlewares';
import { PermissionRoles } from '@src/models/Workspace';
import { handleResponse } from '@src/utils';

import { WorkspaceController } from './controller';
import {
  PayloadCreateWorkspaceSchema,
  PayloadUpdateWorkspaceSchema,
  PayloadUpdatePermissionsWorkspaceSchema,
  PayloadUpdateWorkspaceParams,
} from './validations';

const router = Router();
const workspaceController = new WorkspaceController();

router.get('/by-user/:user', handleResponse(workspaceController.listByUser));

router.use(authMiddleware);
router.post(
  '/',
  PayloadCreateWorkspaceSchema,
  handleResponse(workspaceController.create),
);
router.get('/:id', handleResponse(workspaceController.findById));

router.put(
  '/:id',
  PayloadUpdateWorkspaceSchema,
  authPermissionMiddleware([
    PermissionRoles.OWNER,
    PermissionRoles.ADMIN,
    PermissionRoles.MANAGER,
  ]),
  handleResponse(workspaceController.update),
);
router.put(
  '/:id/permissions/:member',
  PayloadUpdateWorkspaceParams,
  PayloadUpdatePermissionsWorkspaceSchema,
  authPermissionMiddleware([PermissionRoles.OWNER, PermissionRoles.ADMIN]),
  handleResponse(workspaceController.updatePermissions),
);
router.post(
  '/:id/members/:member/remove',
  PayloadUpdateWorkspaceParams,
  authPermissionMiddleware([PermissionRoles.OWNER, PermissionRoles.ADMIN]),
  handleResponse(workspaceController.removeMember),
);
router.post(
  '/:id/members/:member/include',
  PayloadUpdateWorkspaceParams,
  authPermissionMiddleware([PermissionRoles.OWNER, PermissionRoles.ADMIN]),
  handleResponse(workspaceController.addMember),
);
export default router;