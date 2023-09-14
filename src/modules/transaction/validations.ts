import Joi from 'joi';

import { validator } from '@utils/index';

import { allowedStatus } from './types';

export const validateAddTransactionPayload = validator.body(
  Joi.object({
    predicateAdress: Joi.string().required(),
    predicateID: Joi.string().uuid().required(),
    name: Joi.string().required(),
    txData: Joi.string().required(),
    hash: Joi.string().required(),
    status: Joi.string()
      .required()
      .valid(...allowedStatus),
    sendTime: Joi.string().required(),
    gasUsed: Joi.string().required(),
    resume: Joi.string().required(),
  }),
);

export const validateSignerByIdPayload = validator.body(
  Joi.object({
    signer: Joi.string().required(),
    account: Joi.string().required(),
  }),
);

export const validateCloseTransactionPayload = validator.body(
  Joi.object({
    gasUsed: Joi.string().required(),
    transactionResult: Joi.string().required(),
  }),
);
