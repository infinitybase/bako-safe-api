import Joi from 'joi';

import { validator } from '@utils/index';

export const validateAddPredicatePayload = validator.body(
  Joi.object({
    name: Joi.string().required(),
    description: Joi.string().allow('').optional(),
    predicateAddress: Joi.string().required(),
    minSigners: Joi.number().strict(true).integer().min(1).required(),
    addresses: Joi.array().items(Joi.string()).min(1).required(),
    configurable: Joi.string().required(),
    provider: Joi.string().required(),
    chainId: Joi.number().strict(true),
    rootAddress: Joi.string().optional(),
  }),
);
