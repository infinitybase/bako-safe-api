import { Router } from 'express';

import { authMiddleware } from '@src/middlewares';

import { PredicateService } from '@modules/predicate/services';

import { handleResponse } from '@utils/index';

import { AddressBookService } from '../addressBook/services';
import { NotificationService } from '../notification/services';
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
const addressBookService = new AddressBookService();
const notificationService = new NotificationService();

const {
  list,
  listWithIncomings,
  send,
  close,
  create,
  pending,
  findById,
  signByID,
  findByHash,
  createHistory,
} = new TransactionController(
  transactionService,
  predicateService,
  addressBookService,
  notificationService,
);

router.use(authMiddleware);

router.post('/', validateAddTransactionPayload, handleResponse(create));
router.get('/', handleResponse(list));
router.get('/with-incomings', handleResponse(listWithIncomings));
router.get('/pending', handleResponse(pending));
router.get('/:id', handleResponse(findById));
router.get('/by-hash/:hash', handleResponse(findByHash));
router.put('/close/:id', validateCloseTransactionPayload, handleResponse(close));
router.post('/send/:hash', handleResponse(send));
router.put('/sign/:hash', validateSignerByIdPayload, handleResponse(signByID));
router.get('/history/:id/:predicateId', handleResponse(createHistory));

export default router;
