import { Router } from 'express';

import {
  authMiddleware,
  predicatesPermissionMiddleware,
  transactionPermissionMiddleware,
  workspacePermissionMiddleware,
} from '@src/middlewares';

import { PredicateService } from '@modules/predicate/services';

import { handleResponse } from '@utils/index';

import { PermissionRoles } from '@src/models';
import { AddressBookService } from '../addressBook/services';
import { NotificationService } from '../notification/services';
import { TransactionController } from './controller';
import { TransactionService } from './services';
import {
  validateAddTransactionPayload,
  validateCloseTransactionPayload,
  validateSignerByIdPayload,
} from './validations';

const predicatePermissionMiddleware = predicatesPermissionMiddleware({
  predicatesSelector: req => req.query.predicateId as string[],
  permissions: [PermissionRoles.OWNER, PermissionRoles.SIGNER],
});

const wkPermissionMiddleware = workspacePermissionMiddleware({
  workspaceSelector: req => req.query.workspaceId as string,
});

const txPermissionMiddleware = transactionPermissionMiddleware({
  transactionSelector: req => {
    return req.params.hash;
  },
});

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
  cancel,
  findAdvancedDetails,
  deleteByHash,
} = new TransactionController(
  transactionService,
  predicateService,
  addressBookService,
  notificationService,
);

router.get('/:id/advanced-details', handleResponse(findAdvancedDetails));

router.use(authMiddleware);

router.post('/', validateAddTransactionPayload, handleResponse(create));
router.get(
  '/',
  wkPermissionMiddleware,
  predicatePermissionMiddleware,
  handleResponse(list),
);
router.get(
  '/with-incomings',
  wkPermissionMiddleware,
  predicatePermissionMiddleware,
  handleResponse(listWithIncomings),
);
router.get('/pending', predicatePermissionMiddleware, handleResponse(pending));
router.get('/:id', handleResponse(findById));
router.get('/by-hash/:hash', handleResponse(findByHash));
router.put('/close/:id', validateCloseTransactionPayload, handleResponse(close));
router.post('/send/:hash', handleResponse(send));
router.put(
  '/sign/:hash',
  // validateSignerByIdPayload,
  txPermissionMiddleware,
  handleResponse(signByID),
);
router.put('/cancel/:hash', txPermissionMiddleware, handleResponse(cancel));
router.get('/history/:id/:predicateId', handleResponse(createHistory));
router.delete(
  '/by-hash/:hash',
  txPermissionMiddleware,
  handleResponse(deleteByHash),
);

export default router;
