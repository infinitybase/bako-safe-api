import { Router } from 'express';

import { authMiddleware } from '@src/middlewares';
import { handleResponse } from '@src/utils';

import { WorkspaceController } from './controller';

const router = Router();
const workspaceController = new WorkspaceController();

router.get('/by-user/:user', handleResponse(workspaceController.listByUser));

router.use(authMiddleware);
router.post('/', handleResponse(workspaceController.create));
router.post('/:id', handleResponse(workspaceController.findById));

export default router;
