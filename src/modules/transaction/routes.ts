import { Router } from 'express';

import { authMiddleware } from '@src/middlewares';

import { PredicateService } from '@modules/predicate/services';
import { WitnessService } from '@modules/witness/services';

import { handleResponse } from '@utils/index';

import { AddressBookService } from '../addressBook/services';
import { TransactionController } from './controller';
import { TransactionService } from './services';
import {
  validateAddTransactionPayload,
  validateCloseTransactionPayload,
  validateSignerByIdPayload,
} from './validations';

const router = Router();
const transactionService = new TransactionService();
const predicateService = new PredicateService();
const witnessService = new WitnessService();
const addressBookService = new AddressBookService();

const {
  create,
  signByID,
  list,
  findById,
  close,
  findByHash,
} = new TransactionController(
  transactionService,
  predicateService,
  witnessService,
  addressBookService,
);

router.use(authMiddleware);

router.post('/', validateAddTransactionPayload, handleResponse(create));
router.get('/', handleResponse(list));
router.get('/:id', handleResponse(findById));
router.get('/by-hash/:hash', handleResponse(findByHash));
router.put('/close/:id', validateCloseTransactionPayload, handleResponse(close));
router.put('/signer/:id', validateSignerByIdPayload, handleResponse(signByID));

export default router;
