import Joi from 'joi';
import { AddressValidator, validator } from '@utils/index';

export const validateAddPredicatePayload = validator.body(
  Joi.object({
    name: Joi.string().required(),
    description: Joi.string().allow('').optional(),
    predicateAddress: Joi.string().required().custom(AddressValidator.validate),
    configurable: Joi.string().required(),
    version: Joi.string().optional(),
  }),
);

export const validatePredicateIdParams = validator.params(
  Joi.object({
    predicateId: Joi.string().uuid().required(),
  }),
);
