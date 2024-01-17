import { Router } from 'express';

import { authMiddleware, authPermissionMiddleware } from '@src/middlewares';
import { PermissionRoles } from '@src/models/Workspace';

import { PredicateService } from '@modules/predicate/services';
import { WitnessService } from '@modules/witness/services';

import { handleResponse } from '@utils/index';

import { AddressBookService } from '../addressBook/services';
import { AssetService } from '../asset/services';
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
const witnessService = new WitnessService();
const addressBookService = new AddressBookService();
const assetService = new AssetService();
const notificationService = new NotificationService();

const {
  create,
  signByID,
  list,
  findById,
  close,
  findByHash,
  send,
  verifyOnChain,
} = new TransactionController(
  transactionService,
  predicateService,
  witnessService,
  addressBookService,
  assetService,
  notificationService,
);

router.use(authMiddleware);

router.post(
  '/',
  validateAddTransactionPayload,
  authPermissionMiddleware([
    PermissionRoles.OWNER,
    PermissionRoles.ADMIN,
    PermissionRoles.MANAGER,
    PermissionRoles.SIGNER,
  ]),
  handleResponse(create),
);
router.get('/', handleResponse(list));
router.get('/:id', handleResponse(findById));
router.get('/by-hash/:hash', handleResponse(findByHash));
router.put('/close/:id', validateCloseTransactionPayload, handleResponse(close));
router.post('/send/:id', handleResponse(send));
router.post('/verify/:id', handleResponse(verifyOnChain));
router.put('/signer/:id', validateSignerByIdPayload, handleResponse(signByID));

export default router;
