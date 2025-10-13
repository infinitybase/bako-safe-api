import { authMiddleware } from '@src/middlewares';
import { handleResponse } from '@src/utils';
import { Router } from 'express';
import { LayersSwapServiceFactory } from './service';
import LayersSwapController from './controller';
import {
  ValidatorCreateSwapRequest,
  ValidatorUpdateSwapRequest,
  ValidatorDestinationParams,
  ValidatorLimitsParams,
  ValidatorQuotesParams,
} from './validations';

const controller = new LayersSwapController(LayersSwapServiceFactory);

const router = Router();

router.use(authMiddleware);

router.get(
  '/destinations',
  ValidatorDestinationParams,
  handleResponse(controller.getDestinations),
);
router.get('/limits', ValidatorLimitsParams, handleResponse(controller.getLimits));
router.get('/quote', ValidatorQuotesParams, handleResponse(controller.getQuotes));
router.post(
  '/swap',
  ValidatorCreateSwapRequest,
  handleResponse(controller.createSwap),
);
router.put(
  '/swap/:hash',
  ValidatorUpdateSwapRequest,
  handleResponse(controller.updateSwapTransaction),
);

export default router;
