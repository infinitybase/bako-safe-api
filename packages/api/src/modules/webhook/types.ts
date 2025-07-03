import {
  ContainerTypes,
  ValidatedRequest,
  ValidatedRequestSchema,
} from 'express-joi-validation';
import { IMeldTransactionCryptoWeebhook } from '../meld/types';

export interface IWebhookService {
  handleMeldCryptoWebhook(data: IMeldTransactionCryptoWeebhook): Promise<void>;
}

interface IMeldWebhookRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: IMeldTransactionCryptoWeebhook;
}

export type IMeldWebhookRequest = ValidatedRequest<IMeldWebhookRequestSchema>;
