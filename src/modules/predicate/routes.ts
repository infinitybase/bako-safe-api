import { Router } from 'express';

import { authMiddleware } from '@src/middlewares';

import { handleResponse } from '@utils/index';

import { PredicateController } from './controller';
import { PredicateService } from './services';
import { validateAddPredicatePayload } from './validations';

const router = Router();
const predicateService = new PredicateService();
const {
  create,
  findById,
  list,
  update,
  delete: deleteService,
} = new PredicateController(predicateService);

router.use(authMiddleware);

router.post('/', validateAddPredicatePayload, handleResponse(create));
router.get('/', handleResponse(list));
router.get('/:id', handleResponse(findById));
router.put('/:id', handleResponse(update));
router.delete('/:id', handleResponse(deleteService));

export default router;
