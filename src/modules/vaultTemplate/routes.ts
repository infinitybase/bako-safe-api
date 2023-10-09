import { Router } from 'express';

import { authMiddleware } from '@src/middlewares';

import { handleResponse } from '@utils/index';

import { VaultTemplateController } from './controller';
import { VaultTemplateService } from './services';
import { validateCreatePayload } from './validations';

const router = Router();
const vaultTemplateService = new VaultTemplateService();
const { create, list, update } = new VaultTemplateController(vaultTemplateService);

router.use(authMiddleware);

router.get('/', handleResponse(list));
router.post('/', validateCreatePayload, handleResponse(create));
router.put('/:id', handleResponse(update));

export default router;
