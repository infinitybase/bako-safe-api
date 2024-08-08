import Joi from 'joi';

import { AddressValidator, validator } from '@utils/index';

export const validateCreatePayload = validator.body(
  Joi.object({
    name: Joi.string().required(),
    description: Joi.string().optional(),
    minSigners: Joi.number().required(),
    addresses: Joi.array()
      .items(Joi.string())
      .required()
      .custom(AddressValidator.validate),
  }),
);

export const validateFindParams = validator.query(
  Joi.object({
    name: Joi.string().optional(),
    orderBy: Joi.string().optional(),
    sort: Joi.string().optional(),
    page: Joi.string().optional(),
    perPage: Joi.string().optional(),
  }),
);
