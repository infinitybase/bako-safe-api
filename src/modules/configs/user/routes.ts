import { Router } from 'express';

import AuthMiddleware from '@src/middlewares/auth';
import PermissionsMiddleware from '@src/middlewares/permissions';
import { Modules } from '@src/middlewares/permissions/types';

import handleResponse from '@utils/handleResponse';

import { UserController } from './controller';
import { UserService } from './service';
import { PayloadCreateUserSchema, PayloadUpdateUserSchema } from './validation';

const router = Router();
const userService = new UserService();
const userController = new UserController(userService);

router.use(AuthMiddleware);
router.use(PermissionsMiddleware(Modules.CONFIGS));

router.get('/', handleResponse(userController.find));
router.get('/:id', handleResponse(userController.findOne));
router.post('/', PayloadCreateUserSchema, handleResponse(userController.create));
router.put('/:id', PayloadUpdateUserSchema, handleResponse(userController.update));
router.delete('/:id', handleResponse(userController.delete));

export default router;
