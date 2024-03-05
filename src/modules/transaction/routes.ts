import { Router } from 'express';

import { authMiddleware } from '@src/middlewares';

import { PredicateService } from '@modules/predicate/services';
import { WitnessService } from '@modules/witness/services';

import { handleResponse } from '@utils/index';

import { AddressBookService } from '../addressBook/services';
import { AssetService } from '../asset/services';
import { NotificationService } from '../notification/services';
import { UserService } from '../user/service';
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
const assetService = new AssetService();
const notificationService = new NotificationService();
const userService = new UserService();

const {
  list,
  send,
  close,
  create,
  pending,
  findById,
  signByID,
  findByHash,
  verifyOnChain,
  createHistory,
} = new TransactionController(
  transactionService,
  predicateService,
  witnessService,
  addressBookService,
  assetService,
  notificationService,
);

router.use(authMiddleware);

router.post('/', validateAddTransactionPayload, handleResponse(create));
router.get('/', handleResponse(list));
router.get('/pending', handleResponse(pending));
router.get('/:id', handleResponse(findById));
router.get('/by-hash/:hash', handleResponse(findByHash));
router.put('/close/:id', validateCloseTransactionPayload, handleResponse(close));
router.post('/send/:id', handleResponse(send));
router.post('/verify/:id', handleResponse(verifyOnChain));
router.put('/signer/:id', validateSignerByIdPayload, handleResponse(signByID));

router.get('/history/:id', handleResponse(createHistory));

export default router;
