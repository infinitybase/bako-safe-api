import Joi from 'joi';

import { validator } from '@utils/index';

export const validateCreateAPITokenPayload = validator.body(
  Joi.object({
    name: Joi.string().required(),
    config: Joi.object({
      transactionTitle: Joi.string().required(),
    }),
  }),
);

export const validateCreateAPITokenParams = validator.params(
  Joi.object({
    predicateId: Joi.string().uuid(),
  }),
);

export const validateDeleteAPITokenParams = validator.params(
  Joi.object({
    predicateId: Joi.string().uuid(),
    id: Joi.string().uuid(),
  }),
);
