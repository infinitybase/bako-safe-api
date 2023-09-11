import { Router } from 'express';

import { authMiddleware } from '@src/middlewares/auth';
import { handleResponse } from '@src/utils/index';

import { AuthController } from './controller';
import { AuthService } from './services';
import {
  validatePayloadAuthWithRefreshToken,
  validatePayloadSignIn,
} from './validations';

const router = Router();
const authService = new AuthService();
const authController = new AuthController(authService);

router.post(
  '/sign-in',
  validatePayloadSignIn,
  handleResponse(authController.signIn),
);
router.delete('/sign-out', authMiddleware, handleResponse(authController.signOut));
router.post(
  '/refresh-token',
  validatePayloadAuthWithRefreshToken,
  handleResponse(authController.authWithRefreshToken),
);

export default router;
