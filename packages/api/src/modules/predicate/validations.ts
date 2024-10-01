import Joi from 'joi';

import { AddressValidator, validator } from '@utils/index';
import { Address } from 'fuels';

export const validateAddPredicatePayload = validator.body(
  Joi.object({
    name: Joi.string().required(),
    description: Joi.string().allow('').optional(),
    predicateAddress: Joi.string().required().custom(AddressValidator.validate),
    // minSigners: Joi.number().strict(true).integer().min(1).required(),
    // addresses: Joi.array()
    //   .items(Joi.string())
    //   .min(1)
    //   .required()
    //   .custom(AddressValidator.validateMany),
    configurable: Joi.string().required(),
    versionCode: Joi.string().optional(),
  }),
);
