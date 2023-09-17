import Joi from 'joi';

import { validator } from '@utils/index';

export const validateAddPredicatePayload = validator.body(
  Joi.object({
    name: Joi.string().required(),
    predicateAddress: Joi.string().required(),
    description: Joi.string().required(),
    minSigners: Joi.number().required(),
    addresses: Joi.array().required(),
    owner: Joi.string().required(),
    bytes: Joi.string().required(),
    abi: Joi.string().required(),
    configurable: Joi.string().required(),
    provider: Joi.string().required(),
    chainId: Joi.number(),
  }),
);
