import { Router } from 'express';

import { authMiddleware } from '@src/middlewares';

import { handleResponse } from '@utils/index';

import { TransactionService } from '../transaction/services';
import { PredicateController } from './controller';
import { PredicateService } from './services';
import { validateAddPredicatePayload } from './validations';

const router = Router();
const predicateService = new PredicateService();
const transactionService = new TransactionService();
const {
  create,
  findById,
  list,
  findByAddress,
  // update,
  hasReservedCoins,
  delete: deleteService,
} = new PredicateController(predicateService, transactionService);

router.use(authMiddleware);

router.post('/', validateAddPredicatePayload, handleResponse(create));
router.get('/', handleResponse(list));
router.get('/:id', handleResponse(findById));
router.get('/reserved-coins/:address', handleResponse(hasReservedCoins));
router.get('/by-address/:address', handleResponse(findByAddress));
// router.put('/:id', handleResponse(update));
router.delete('/:id', handleResponse(deleteService));

export default router;
