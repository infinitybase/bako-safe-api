import { Router } from 'express';

import { handleResponse } from '@src/utils/index';

import { AuthController } from './controller';
import { AuthService } from './services';

import { validateSignInPayload } from './validations';

const router = Router();
const authService = new AuthService();

const { signIn, generateSignCode, signOut } = new AuthController(authService);

router.post('/sign-in', validateSignInPayload, handleResponse(signIn));
router.post('/code', handleResponse(generateSignCode));
router.delete('/sign-out', handleResponse(signOut));

export default router;
