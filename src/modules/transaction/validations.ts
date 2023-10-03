import Joi from 'joi';

import { TransactionStatus } from '@models/index';

import { validator } from '@utils/index';

const allowedStatus = Object.values(TransactionStatus);

export const validateAddTransactionPayload = validator.body(
  Joi.object({
    predicateAdress: Joi.string().required(),
    predicateID: Joi.string().uuid(),
    name: Joi.string().required(),
    txData: Joi.string().required(),
    hash: Joi.string().required(),
    status: Joi.string()
      .required()
      .valid(...allowedStatus),
    assets: Joi.array()
      .items(
        Joi.object({
          to: Joi.string().required(),
          assetID: Joi.string().required(),
          amount: Joi.string().required(),
        }),
      )
      .required(),
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
