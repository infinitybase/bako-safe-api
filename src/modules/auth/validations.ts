import Joi from 'joi';

import { validator } from '@utils/index';

export const validatePayloadSignIn = validator.body(
  Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
);

export const validatePayloadAuthWithRefreshToken = validator.body(
  Joi.object({
    refreshToken: Joi.string().required(),
  }),
);
