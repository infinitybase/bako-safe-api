import { Router } from 'express';

import { authMiddleware } from '@src/middlewares';

import { handleResponse } from '@utils/index';

import { VaultTemplateService } from '../vaultTemplate/services';
import { PredicateController } from './controller';
import { PredicateService } from './services';
import { validateAddPredicatePayload } from './validations';

const router = Router();
const predicateService = new PredicateService();
const vaultTemplateService = new VaultTemplateService();
const {
  create,
  findById,
  list,
  findByAddress,
  // update,
  delete: deleteService,
} = new PredicateController(predicateService);

router.use(authMiddleware);

router.post('/', validateAddPredicatePayload, handleResponse(create));
router.get('/', handleResponse(list));
router.get('/:id', handleResponse(findById));
router.get('/by-address/:address', handleResponse(findByAddress));
// router.put('/:id', handleResponse(update));
router.delete('/:id', handleResponse(deleteService));

export default router;
