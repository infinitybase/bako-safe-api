import { Router } from 'express';

import { handleResponse } from '@utils/index';

import { DappController } from './controller';
import { DAppsService } from './service';

const router = Router();
const dAppService = new DAppsService();
const { currentAccount, accounts, state } = new DappController(dAppService);

router.get('/:sessionId/state', handleResponse(state));
router.get('/:sessionId/accounts', handleResponse(accounts));
router.get('/:sessionId/currentAccount', handleResponse(currentAccount));

export default router;
