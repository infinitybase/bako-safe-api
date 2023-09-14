import { Router } from 'express';

import { authMiddleware } from '@middlewares/index';

import { handleResponse } from '@utils/index';

import { TransactionController } from './controller';
import { TransactionService } from './services';
import {
  validateAddTransactionPayload,
  validateCloseTransactionPayload,
  validateSignerByIdPayload,
} from './validations';

const router = Router();
const transactionService = new TransactionService();
const {
  add,
  findAll,
  findById,
  findByTo,
  signerByID,
  close,
  findByPredicateId,
} = new TransactionController(transactionService);

router.use(authMiddleware);

// add transaction
router.post('/', validateAddTransactionPayload, handleResponse(add));

// list all transactions
router.get('/', handleResponse(findAll));

// list transaction by ID
router.get('/:id', handleResponse(findById));

// list all transactions by predicateID
router.get('/predicate/:predicateId', handleResponse(findByPredicateId));

//list all transactions byDestiny [fuel2sa..ska0]
router.get('/destination/:to', handleResponse(findByTo));

//close transaction after sending
router.put('/close/:id', validateCloseTransactionPayload, handleResponse(close));

//update transaction
router.put('/signer/:id', validateSignerByIdPayload, handleResponse(signerByID));

export default router;
