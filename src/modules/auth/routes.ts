import { Router } from 'express';

import { handleResponse } from '@src/utils/index';

import { UserService } from '../user/service';
import { AuthController } from './controller';
import { AuthService } from './services';
import { validateSignInPayload } from './validations';

const router = Router();
const authService = new AuthService();
const userService = new UserService();
const { signIn, updateWorkspace, authCode } = new AuthController(
  authService,
  userService,
);

export const signOutPath = '/sign-out';

router.post('/sign-in/:id', validateSignInPayload, handleResponse(signIn));

//todo: verify why do cant use authMiddleware here
router.put('/workspace', handleResponse(updateWorkspace));

router.post('/auth/code', handleResponse(authCode));

//router.delete(signOutPath, authMiddleware, handleResponse(authController.signOut));

export default router;
