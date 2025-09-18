import { MeldAuthMiddleware } from '@src/middlewares/meld';
import { handleResponse } from '@src/utils';
import { Router } from 'express';
import WebhookController from './controller';
import WebhookService from './services';
import bodyParser from 'body-parser';

const service = new WebhookService();
const controller = new WebhookController(service);

const webhookRouters = Router();
const webhookRawRouters = Router();

webhookRouters.post(
  '/meld/crypto',
  MeldAuthMiddleware,
  handleResponse(controller.handleMeldCryptoWebhook),
);

webhookRawRouters.post(
  '/layers-swap',
  bodyParser.raw({ type: 'application/json' }),
  handleResponse(controller.handleLayersSwapWebhook),
);

export { webhookRouters, webhookRawRouters };
