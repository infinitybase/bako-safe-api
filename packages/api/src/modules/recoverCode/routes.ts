import { Router } from 'express';

import { authMiddleware } from '@src/middlewares';
import { handleResponse } from '@utils/index';

import { RecoverCodeController } from './controller';

const router = Router();

const { generateRecoverCode } = new RecoverCodeController();

router.post('/generate', authMiddleware, handleResponse(generateRecoverCode));

export default router;
