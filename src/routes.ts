import { Router } from 'express';

import auth from '@modules/auth/routes';
import roles from '@modules/configs/roles/routes';
import users from '@modules/configs/user/routes';
import predicates from '@modules/predicate/routes';
import transactions from '@modules/transaction/routes';
import vaultTemplate from '@modules/vaultTemplate/routes';

import { DAppsService } from './modules/dApps/service';

const ses = new DAppsService();
const router = Router();

router.use('/auth', auth);
router.use('/role', roles);
router.use('/user', users);
router.use('/predicate', predicates);
router.use('/transaction', transactions);
router.use('/template', vaultTemplate);

export { router };
