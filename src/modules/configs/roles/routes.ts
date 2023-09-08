import { Router } from 'express';

import AuthMiddleware from '@src/middlewares/auth';
import PermissionsMiddleware from '@src/middlewares/permissions';
import { Modules } from '@src/middlewares/permissions/types';

import handleResponse from '@utils/handleResponse';

import { RoleController } from './controller';
import { RoleService } from './services';
import { PayloadRoleSchema } from './validations';

const router = Router();
const roleService = new RoleService();
const roleController = new RoleController(roleService);

router.use(AuthMiddleware);
router.use(PermissionsMiddleware(Modules.ROLES));

router.get('/modules', handleResponse(roleController.findModules));
router.get('/', handleResponse(roleController.find));
router.get('/:id', handleResponse(roleController.findOne));
router.post('/', PayloadRoleSchema, handleResponse(roleController.create));
router.put('/:id', PayloadRoleSchema, handleResponse(roleController.update));
router.delete('/:id', handleResponse(roleController.delete));

export default router;
