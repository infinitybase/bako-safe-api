import Joi from 'joi';

import { validator } from '@utils/index';

export const PayloadCreateUserSchema = validator.body(
  Joi.object({
    name: Joi.string(),
    email: Joi.string().email(),
    password: Joi.string(),
    active: Joi.boolean(),
    role: Joi.string().uuid(),
    address: Joi.string().required(),
    provider: Joi.string().required(),
    webauthn: Joi.object().optional(), //todo: type corretly this
  }),
);

export const PayloadUpdateUserSchema = validator.body(
  Joi.object({
    name: Joi.string().allow(''),
    email: Joi.string().email().allow(''),
    notify: Joi.boolean().optional(),
    first_login: Joi.boolean().optional(),
  }),
);
