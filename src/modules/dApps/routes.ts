import { Router } from 'express';

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
} = new DappController(dAppService);

router.get('/:sessionId/state', handleResponse(state));
router.get('/:sessionId/accounts', handleResponse(accounts));
router.get('/:sessionId/currentAccount', handleResponse(currentAccount));
router.get('/:sessionId/currentNetwork', handleResponse(currentNetwork));
router.get('/:sessionId', handleResponse(current));

export default router;
