import { Router } from 'express';

import { PredicateService } from '@modules/predicate/services';
import { WitnessService } from '@modules/witness/services';

import { handleResponse } from '@utils/index';

import { AssetService } from '../asset/services';
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
const assetService = new AssetService();

const {
  create,
  signByID,
  list,
  findById,
  close,
  findByHash,
  send,
} = new TransactionController(
  transactionService,
  predicateService,
  witnessService,
  assetService,
);

//router.use(authMiddleware);

router.post('/', validateAddTransactionPayload, handleResponse(create));
router.get('/', handleResponse(list));
router.get('/:id', handleResponse(findById));
router.get('/by-hash/:hash', handleResponse(findByHash));
router.put('/close/:id', validateCloseTransactionPayload, handleResponse(close));
router.post('/send/:id', handleResponse(send));
router.put('/signer/:id', validateSignerByIdPayload, handleResponse(signByID));

export default router;
