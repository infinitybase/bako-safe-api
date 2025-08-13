import { bindMethods, successful } from '@src/utils';
import { error } from '@src/utils/error';
import { IMeldWebhookRequest, IWebhookService } from './types';

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
}
