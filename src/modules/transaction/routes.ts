import { Router } from 'express';

import { authMiddleware } from '@middlewares/index';

import { handleResponse } from '@utils/index';

import { TransactionController } from './controller';
import { TransactionService } from './services';
import { validateAddTransactionPayload } from './validations';

const router = Router();
const transactionService = new TransactionService();
const {
  add,
  findAll,
  findById,
  findByTo,
  // findByAddress,
  // signerByID,
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
router.put('/close/:id', handleResponse(close));

//update transaction
// router.put('/signer/:id', handleResponse(signerByID));

// list by address
// router.get('/by-address/:address', handleResponse(findByAddress));

export default router;
