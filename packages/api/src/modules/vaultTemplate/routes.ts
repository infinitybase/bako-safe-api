import { Router } from 'express';

import { authMiddleware } from '@src/middlewares';

import { handleResponse } from '@utils/index';

import { UserService } from '../user/service';
import { VaultTemplateController } from './controller';
import { VaultTemplateService } from './services';
import { validateCreatePayload } from './validations';

const router = Router();
const vaultTemplateService = new VaultTemplateService();
const userService = new UserService();
const { create, list, update, findById } = new VaultTemplateController(
  vaultTemplateService,
  userService,
);

router.use(authMiddleware);

router.get('/', handleResponse(list));
router.post('/', validateCreatePayload, handleResponse(create));
router.get('/:id', handleResponse(findById));
router.put('/:id', handleResponse(update));

export default router;
