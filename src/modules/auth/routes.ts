import { Router } from 'express';

import { authMiddleware } from '@src/middlewares/auth';
import { handleResponse } from '@src/utils/index';

import { UserService } from '../configs/user/service';
import { DAppsService } from '../dApps/service';
import { AuthController } from './controller';
import { AuthService } from './services';
import { validateSignInPayload, validateSignInDappPayload } from './validations';

const router = Router();
const dappsService = new DAppsService();
const authService = new AuthService();
const userService = new UserService();
const authController = new AuthController(authService, userService, dappsService);

export const signOutPath = '/sign-out';

router.post(
  '/sign-in',
  validateSignInPayload,
  handleResponse(authController.signIn),
);

router.post(
  '/dapps/sign-up',
  validateSignInDappPayload,
  handleResponse(authController.authorizeDapp),
);

router.get('/dapps/:sessionID', handleResponse(authController.authorizedDapp));

router.get(
  '/dapps/active-session/:sessionId',
  handleResponse(authController.activeSession),
);

router.delete(signOutPath, authMiddleware, handleResponse(authController.signOut));

export default router;
