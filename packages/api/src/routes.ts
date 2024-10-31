import { Router } from 'express';

import users from '@src/modules/user/routes';

import addressBook from '@modules/addressBook/routes';
import auth from '@modules/auth/routes';
import dApp from '@modules/dApps/routes';
import notifications from '@modules/notification/routes';
import predicates from '@modules/predicate/routes';
import predicateVersions from '@modules/predicateVersion/routes';
import transactions from '@modules/transaction/routes';
import workspace from '@modules/workspace/routes';
import apiToken, { cliAuthRoute } from '@modules/apiToken/routes';
import debugPprof from '@modules/debugPprof/routes';
import externalRoute from '@modules/external/routes';

const { API_ENVIRONMENT, API_NAME } = process.env;

const router = Router();

router.use('/auth', auth);
router.use('/user', users);
router.use('/predicate/version', predicateVersions);
router.use('/predicate', predicates);
router.use('/transaction', transactions);
router.use('/address-book', addressBook);
router.use('/connections', dApp);
router.use('/notifications', notifications);
router.use('/workspace', workspace);
router.use('/api-token', apiToken);
router.use('/debug-pprof', debugPprof);
router.use('/cli', cliAuthRoute);
router.use('/external', externalRoute);

// ping route
router.get('/ping', ({ res }) =>
  res.send(`${new Date().toISOString()} ${API_NAME} ${API_ENVIRONMENT}`),
);

router.get('/healthcheck', ({ res }) => res.status(200).send({ status: 'ok' }));

export { router };
