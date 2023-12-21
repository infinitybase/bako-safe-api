import { Router } from 'express';

import { handleResponse } from '@src/utils';

import { WorkspaceController } from './controller';

const router = Router();
const workspaceController = new WorkspaceController();

router.get('/by-user/:user', handleResponse(workspaceController.listByUser));

export default router;
