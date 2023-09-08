import { Router } from 'express';

import auth from '@modules/auth/routes';
import roles from '@modules/configs/roles/routes';
import users from '@modules/configs/user/routes';

const router = Router();

router.use('/auth', auth);
router.use('/role', roles);
router.use('/user', users);

export { router };
