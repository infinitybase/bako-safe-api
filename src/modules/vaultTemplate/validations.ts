import Joi from 'joi';

import { validator } from '@utils/index';

export const validateCreatePayload = validator.body(
  Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    minSigners: Joi.number().required(),
    addresses: Joi.array().items(Joi.string()).required(),
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
