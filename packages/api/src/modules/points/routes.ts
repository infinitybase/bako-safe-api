import { PointsService } from '@modules/points/service';
import { PointsController } from '@modules/points/controller';
import { Router } from 'express';
import { handleResponse } from '@src/utils';
import { authPointsMiddleware } from '@src/middlewares';

const router = Router();

const pointsService = new PointsService();
const pointsController = new PointsController(pointsService);

router.use(authPointsMiddleware);

router.get(
  '/transaction/simple/:data/:address',
  handleResponse(pointsController.getSimpleTransaction),
);
router.get(
  '/transaction/multisig/:data/:address',
  handleResponse(pointsController.getMultisigTransaction),
);
router.get(
  '/user/:predicateAddress',
  handleResponse(pointsController.getUserAddressAndType),
);

export default router;
