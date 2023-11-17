import { Router } from 'express';

import { handleResponse } from '@src/utils/index';

import { UserService } from '../configs/user/service';
import { AuthController } from './controller';
import { AuthService } from './services';
import { validateSignInPayload } from './validations';

const router = Router();
const authService = new AuthService();
const userService = new UserService();
const authController = new AuthController(authService, userService);

export const signOutPath = '/sign-out';

router.post(
  '/sign-in',
  validateSignInPayload,
  handleResponse(authController.signIn),
);

//router.delete(signOutPath, authMiddleware, handleResponse(authController.signOut));

export default router;
