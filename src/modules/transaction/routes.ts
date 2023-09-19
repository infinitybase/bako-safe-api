import { Router } from 'express';

import { authMiddleware } from '@middlewares/index';

import { PredicateService } from '@modules/predicate/services';
import { WitnessService } from '@modules/witness/services';

import { handleResponse } from '@utils/index';

import { TransactionController } from './controller';
import { TransactionService } from './services';
import {
  validateAddTransactionPayload,
  validateSignerByIdPayload,
  validateCloseTransactionPayload,
} from './validations';

const router = Router();
const transactionService = new TransactionService();
const predicateService = new PredicateService();
const witnessService = new WitnessService();

const { create, signByID, list, findById, close } = new TransactionController(
  transactionService,
  predicateService,
  witnessService,
);

router.use(authMiddleware);

router.post('/', validateAddTransactionPayload, handleResponse(create));
router.get('/', handleResponse(list));
router.get('/:id', handleResponse(findById));
router.put('/close/:id', validateCloseTransactionPayload, handleResponse(close));
router.put('/signer/:id', validateSignerByIdPayload, handleResponse(signByID));

export default router;
