import { Router } from 'express';

import { authMiddleware } from '@middlewares/index';

import { handleResponse } from '@utils/index';

import { UserController } from './controller';
import { UserService } from './service';
import { PayloadCreateUserSchema, PayloadUpdateUserSchema } from './validation';

const router = Router();
const userService = new UserService();
const userController = new UserController(userService);

router.post('/', PayloadCreateUserSchema, handleResponse(userController.create));

router.use(authMiddleware);

router.get('/', handleResponse(userController.find));
router.get('/me', handleResponse(userController.me));
router.get('/:id', handleResponse(userController.findOne));
router.put('/:id', PayloadUpdateUserSchema, handleResponse(userController.update));
router.delete('/:id', handleResponse(userController.delete));

export default router;
