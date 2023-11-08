import Joi from 'joi';

import { TransactionStatus } from '@models/index';

import { validator } from '@utils/index';

const allowedStatus = Object.values(TransactionStatus);

export const validateAddTransactionPayload = validator.body(
  Joi.object({
    predicateAddress: Joi.string().required(),
    name: Joi.string().required(),
    hash: Joi.string().required(),
    status: Joi.string()
      .required()
      .valid(...allowedStatus),
    assets: Joi.array()
      .items({
        assetId: Joi.string().required(),
        to: Joi.string().required(),
        amount: Joi.string().required(),
        utxo: Joi.string().required().allow(null, ''),
      })
      .required(),
    sendTime: Joi.string(),
    gasUsed: Joi.string(),
    resume: Joi.string(),
  }),
);

export const validateSignerByIdPayload = validator.body(
  Joi.object({
    signer: Joi.string().when('confirm', {
      is: true,
      then: Joi.required(),
    }),
    account: Joi.string().required(),
    confirm: Joi.boolean().required(),
  }),
);

export const validateCloseTransactionPayload = validator.body(
  Joi.object({
    gasUsed: Joi.string().required(),
    transactionResult: Joi.string().required(),
    hasError: Joi.boolean(),
  }),
);
