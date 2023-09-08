import { Router } from 'express';

import auth from '@modules/auth/routes';
import roles from '@modules/configs/roles/routes';
import users from '@modules/configs/user/routes';
import helloRoutes from '@modules/hello-world/routes';
import me from '@modules/me/routes';

const router = Router();

router.use('/hello', helloRoutes);
router.use('/auth', auth);
router.use('/me', me);
router.use('/configs-role', roles);
router.use('/configs-user', users);

export default router;
