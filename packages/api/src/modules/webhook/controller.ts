import { bindMethods, successful } from '@src/utils';
import { error } from '@src/utils/error';
import { Webhook } from 'svix';
import {
  ILayersSwapWebhookRequest,
  IMeldWebhookRequest,
  IWebhookService,
} from './types';

export default class WebhookController {
  constructor(private _service: IWebhookService) {
    bindMethods(this);
  }

  async handleMeldCryptoWebhook(request: IMeldWebhookRequest) {
    try {
      await this._service.handleMeldCryptoWebhook(request.body);
      return successful({ message: 'Webhook processed successfully' }, 200);
    } catch (e) {
      console.log(e);
      return error(e.error, e.statusCode);
    }
  }

  async handleLayersSwapWebhook(req: ILayersSwapWebhookRequest) {
    const payload: Buffer = req.body;
    const headers = req.headers;
    const { LAYERS_SWAP_WEBHOOK_SECRET } = process.env;

    const wh = new Webhook(LAYERS_SWAP_WEBHOOK_SECRET);
    try {
      const msg = wh.verify(payload, headers);
      console.log('Webhook verified:', msg);
      return successful({ message: 'Webhook processed successfully' }, 200);
    } catch (e) {
      console.error('Error verifying webhook:', e);
      return error(e?.message || 'Invalid webhook signature', 400);
    }
  }
}
