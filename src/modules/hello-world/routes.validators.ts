import Joi from 'joi';

import validator from '@utils/validator';

export const validatePayloadExample = validator.body(
  Joi.object({
    name: Joi.string().required(),
  }),
);
