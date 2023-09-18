import { Router } from 'express';

import { Modules } from '@src/middlewares/permissions/types';

import { PermissionsMiddleware } from '@middlewares/index';
import { authMiddleware } from '@middlewares/index';

import { handleResponse } from '@utils/index';

import { UserController } from './controller';
import { UserService } from './service';
import { PayloadCreateUserSchema, PayloadUpdateUserSchema } from './validation';

const router = Router();
const userService = new UserService();
const userController = new UserController(userService);

router.use(authMiddleware);
router.use(PermissionsMiddleware(Modules.CONFIGS));

router.get('/', handleResponse(userController.find));
router.get('/:id', handleResponse(userController.findOne));
router.post('/', PayloadCreateUserSchema, handleResponse(userController.create));
router.put('/:id', PayloadUpdateUserSchema, handleResponse(userController.update));
router.delete('/:id', handleResponse(userController.delete));

export default router;
