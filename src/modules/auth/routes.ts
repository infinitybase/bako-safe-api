import { Router } from 'express';

import { authMiddleware } from '@src/middlewares/auth';
import { handleResponse } from '@src/utils/index';

import { AuthController } from './controller';
import { AuthService } from './services';
import { validateSignInPayload } from './validations';

const router = Router();
const authService = new AuthService();
const authController = new AuthController(authService);

export const signOutPath = '/sign-out';

router.post(
  '/sign-in',
  validateSignInPayload,
  handleResponse(authController.signIn),
);

router.delete(signOutPath, authMiddleware, handleResponse(authController.signOut));

export default router;
