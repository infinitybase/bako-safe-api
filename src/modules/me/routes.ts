import { Router } from 'express';

import AuthMiddleware from '@src/middlewares/auth';
import handleResponse from '@src/utils/handleResponse';

import { MeController } from './controller';

const controller = new MeController();

const router = Router();

router.get('/', AuthMiddleware, handleResponse(controller.retrieveMe));

export default router;
