import { TransactionStatus } from 'bakosafe';
import Joi from 'joi';

import { AddressValidator, validator } from '@utils/index';

const allowedStatus = Object.values(TransactionStatus);

export const validateAddTransactionPayload = validator.body(
  Joi.object({
    predicateAddress: Joi.string().required().custom(AddressValidator.validate),
    name: Joi.string().required(),
    hash: Joi.string().required(),
    txData: Joi.object().required(),
    status: Joi.string()
      .required()
      .valid(...allowedStatus),
    sendTime: Joi.string().optional(),
    gasUsed: Joi.string().optional(),
    resume: Joi.string().optional(),
  }),
);

export const validateSignerByIdPayload = validator.body(
  Joi.object({
    signer: Joi.string().when('confirm', {
      is: true,
      then: Joi.required(),
    }),
    // account: Joi.string().required(),
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
