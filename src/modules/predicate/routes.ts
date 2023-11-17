import { Router } from 'express';

import { authMiddleware } from '@src/middlewares';

import { handleResponse } from '@utils/index';


import { UserService } from '../configs/user/service';

import { TransactionService } from '../transaction/services';
import { VaultTemplateService } from '../vaultTemplate/services';
import { PredicateController } from './controller';
import { PredicateService } from './services';
import { validateAddPredicatePayload } from './validations';

const router = Router();
const predicateService = new PredicateService();

const userService = new UserService();

const transactionService = new TransactionService();
const vaultTemplateService = new VaultTemplateService();
const {
  create,
  findById,
  list,
  findByAddress,
  delete: deleteService,
} = new PredicateController(predicateService, transactionService, userService);

router.use(authMiddleware);

router.post('/', validateAddPredicatePayload, handleResponse(create));
router.get('/', handleResponse(list));
router.get('/:id', handleResponse(findById));
router.get('/reserved-coins/:address', handleResponse(hasReservedCoins));
router.get('/by-address/:address', handleResponse(findByAddress));
router.delete('/:id', handleResponse(deleteService));

export default router;
