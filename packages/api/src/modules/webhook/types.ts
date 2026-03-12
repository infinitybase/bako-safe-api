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

interface ILayersSwapWebhookRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: Buffer;
}

export type IMeldWebhookRequest = ValidatedRequest<IMeldWebhookRequestSchema>;
export type ILayersSwapWebhookRequest = ValidatedRequest<ILayersSwapWebhookRequestSchema>;
