import { Router } from 'express';

import { authMiddleware } from '@src/middlewares';
import { handleResponse } from '@src/utils';

import { WorkspaceController } from './controller';
import {
  PayloadCreateWorkspaceSchema,
  PayloadUpdateWorkspaceSchema,
  PayloadUpdateMembersWorkspaceSchema,
  PayloadUpdatePermissionsWorkspaceSchema,
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
  handleResponse(workspaceController.update),
);
router.put(
  '/:id/permissions',
  PayloadUpdatePermissionsWorkspaceSchema,
  handleResponse(workspaceController.updatePermissions),
);
router.put(
  '/:id/members',
  PayloadUpdateMembersWorkspaceSchema,
  handleResponse(workspaceController.updateMembers),
);
export default router;
