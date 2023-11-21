import { Router } from 'express';

import { authMiddleware } from '@middlewares/index';

import { handleResponse } from '@utils/index';

import { RoleController } from './controller';
import { RoleService } from './services';
import { PayloadRoleSchema } from './validations';

const router = Router();
const roleService = new RoleService();
const roleController = new RoleController(roleService);

router.use(authMiddleware);

router.get('/modules', handleResponse(roleController.findModules));
router.get('/', handleResponse(roleController.find));
router.get('/:id', handleResponse(roleController.findOne));
router.post('/', PayloadRoleSchema, handleResponse(roleController.create));
router.put('/:id', PayloadRoleSchema, handleResponse(roleController.update));
router.delete('/:id', handleResponse(roleController.delete));

export default router;
