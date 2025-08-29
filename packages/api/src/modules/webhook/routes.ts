import { MeldAuthMiddleware } from '@src/middlewares/meld';
import { handleResponse } from '@src/utils';
import { Router } from 'express';
import WebhookController from './controller';
import WebhookService from './services';

const service = new WebhookService();
const controller = new WebhookController(service);

const router = Router();

router.post(
  '/meld/crypto',
  MeldAuthMiddleware,
  handleResponse(controller.handleMeldCryptoWebhook),
);

export default router;
