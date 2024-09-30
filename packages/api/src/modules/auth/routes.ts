import { Router } from 'express';

import { handleResponse } from '@src/utils/index';

import { AuthController } from './controller';
import { AuthService } from './services';
import { validateSignInPayload } from './validations';
import { authMiddleware } from '@src/middlewares';

const router = Router();
const authService = new AuthService();

const { signIn, generateSignCode, signOut } = new AuthController(authService);

router.post('/select-network', authMiddleware, (req, res) => {
  console.log('--------> [api_request]');
  console.log({
    body: req.body,
    query: req.query,
    params: req.params,
    // user: req.user,
    // network: req.network,
  });

  res.json({ message: 'select-network' });
});

// export const signOutPath = '/sign-out';

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
