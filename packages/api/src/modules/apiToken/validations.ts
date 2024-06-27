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
