import { Router } from 'express';

import { handleResponse } from '@src/utils/index';

import { AuthController } from './controller';
import { AuthService } from './services';
import { validateSignInCodeParams, validateSignInPayload } from './validations';

const router = Router();
const authService = new AuthService();
const { signIn, signOut, generateSignCode } = new AuthController(authService);

router.post('/sign-in', validateSignInPayload, handleResponse(signIn));

router.post(
  '/code',
  // validateSignInCodeParams,
  handleResponse(generateSignCode),
);

//todo: verify why do cant use authMiddleware here
// router.put('/workspace', handleResponse(updateWorkspace));

router.delete('/sign-out', handleResponse(signOut));

export default router;
