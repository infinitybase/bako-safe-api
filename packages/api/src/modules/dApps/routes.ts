import { Router } from 'express';

import { authMiddleware } from '@src/middlewares';

import { handleResponse } from '@utils/index';

import { DappController } from './controller';
import { DAppsService } from './service';

const router = Router();
const dAppService = new DAppsService();
const {
  currentAccount,
  current,
  accounts,
  state,
  currentNetwork,
  disconnect,
  connect,
  createConnectorCode,
  changeNetwork,
  changeAccount,
} = new DappController(dAppService);

router.post('/', authMiddleware, handleResponse(connect));

router.get(
  '/:sessionId/transaction/:vaultAddress/:txId',
  handleResponse(createConnectorCode),
);

router.put('/:sessionId/network', handleResponse(changeNetwork));
router.put('/:sessionId/:vault', handleResponse(changeAccount));

router.get('/:sessionId/state', handleResponse(state));
router.get('/:sessionId/accounts', handleResponse(accounts));
router.get('/:sessionId/currentAccount', handleResponse(currentAccount));
router.get('/:sessionId/currentNetwork', handleResponse(currentNetwork));
router.get('/:sessionId', handleResponse(current));

router.delete('/:sessionId', handleResponse(disconnect));

export default router;
