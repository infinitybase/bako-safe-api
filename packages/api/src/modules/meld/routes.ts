import { authMiddleware } from '@src/middlewares';
import { handleResponse } from '@src/utils';
import { Router } from 'express';
import RampTransactionsService from '../rampTransactions/service';
import MeldController from './controller';
import MeldService from './services';
import { ValidatorCreateWidgetRequest, ValidatorRequestQuote } from './validations';

const meldService = new MeldService();
const rampService = new RampTransactionsService();
const controller = new MeldController(meldService, rampService);

const router = Router();

router.use(authMiddleware);

router.get('/countries', handleResponse(controller.getCountries));
router.get('/fiat-currencies', handleResponse(controller.getFiatCurrencies));
router.get('/crypto-currencies', handleResponse(controller.getCryptoCurrencies));
router.get(
  '/buy-purchase-limits',
  handleResponse(controller.getOnRampPurchaseLimits),
);
router.get(
  '/sell-purchase-limits',
  handleResponse(controller.getOffRampPurchaseLimits),
);
router.get('/payment-methods', handleResponse(controller.getPaymentMethods));
router.get('/providers', handleResponse(controller.getServiceProviders));
router.post('/quotes', ValidatorRequestQuote, handleResponse(controller.getQuotes));
router.post(
  '/widget',
  ValidatorCreateWidgetRequest,
  handleResponse(controller.createWidgetSession),
);

export default router;
