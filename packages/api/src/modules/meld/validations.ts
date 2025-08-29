import { validator } from '@src/utils';
import Joi from 'joi';

export const ValidatorRequestQuote = validator.body(
  Joi.object({
    countryCode: Joi.string().required(),
    customerId: Joi.string().optional(),
    destinationCurrencyCode: Joi.string().required(),
    externalCustomerId: Joi.string().optional(),
    paymentMethodType: Joi.string().optional(),
    sourceAmount: Joi.number().min(0).required(),
    sourceCurrencyCode: Joi.string().required(),
    subdivision: Joi.string().optional(),
    walletAddress: Joi.string().optional(),
  }),
);

export const ValidatorCreateWidgetRequest = validator.body(
  Joi.object({
    type: Joi.string().valid('BUY', 'SELL').required(),
    countryCode: Joi.string().required(),
    destinationCurrencyCode: Joi.string().required(),
    destinationAmount: Joi.string().optional(),
    serviceProvider: Joi.string().required(),
    sourceAmount: Joi.string().required(),
    sourceCurrencyCode: Joi.string().required(),
    paymentMethodType: Joi.string().required(),
    walletAddress: Joi.string().when('type', {
      is: Joi.string().valid('BUY'),
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  }),
);
