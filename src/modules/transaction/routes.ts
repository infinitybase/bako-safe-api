import { Router } from 'express';

import { authMiddleware } from '@middlewares/index';

import { handleResponse } from '@utils/index';

import { PredicateService } from '../predicate/services';
import { WitnessService } from '../witness/services';
import { TransactionController } from './controller';
import { TransactionService } from './services';
import {
  validateAddTransactionPayload,
  validateSignerByIdPayload,
} from './validations';

const router = Router();
const transactionService = new TransactionService();
const predicateService = new PredicateService();
const witnessService = new WitnessService();
const { create, signByID, list, findById } = new TransactionController(
  transactionService,
  predicateService,
  witnessService,
);

router.use(authMiddleware);

router.post('/', validateAddTransactionPayload, handleResponse(create));

router.get('/', handleResponse(list));

router.get('/:id', handleResponse(findById));

//close transaction after sending
// router.put('/close/:id', validateCloseTransactionPayload, handleResponse(close));

//update transaction
router.put('/signer/:id', validateSignerByIdPayload, handleResponse(signByID));

export default router;
