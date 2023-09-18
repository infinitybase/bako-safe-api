import Joi from 'joi';

import { Languages } from '@src/models';

import { validator } from '@utils/index';

export const PayloadCreateUserSchema = validator.body(
  Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    active: Joi.boolean().required(),
    language: Joi.string()
      .valid(...Object.values(Languages))
      .required(),
    role: Joi.number().required(),
  }),
);

export const PayloadUpdateUserSchema = validator.body(
  Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().optional(),
    active: Joi.boolean().required(),
    language: Joi.string()
      .valid(...Object.values(Languages))
      .required(),
    role: Joi.number().required(),
  }),
);
