import Joi from 'joi';

import { validator } from '@utils/index';

import { allowedStatus } from './types';

export const validateAddTransactionPayload = validator.body(
  Joi.object({
    predicateAdress: Joi.string().required(),
    predicateID: Joi.number().required(),
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
