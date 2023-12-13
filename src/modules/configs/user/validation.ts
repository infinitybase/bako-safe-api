import Joi from 'joi';

import { Languages } from '@src/models';

import { validator } from '@utils/index';

export const PayloadCreateUserSchema = validator.body(
  Joi.object({
    name: Joi.string(),
    email: Joi.string().email(),
    password: Joi.string(),
    active: Joi.boolean(),
    language: Joi.string().valid(...Object.values(Languages)),
    role: Joi.string().uuid(),
    address: Joi.string().required(),
    provider: Joi.string().required(),
  }),
);

export const PayloadUpdateUserSchema = validator.body(
  Joi.object({
    name: Joi.string().allow(''),
    email: Joi.string().email().allow(''),
    notify: Joi.boolean().required(),
  }),
);
