import Joi from 'joi';

import { AddressValidator, validator } from '@utils/index';

export const PayloadCreateUserSchema = validator.body(
  Joi.object({
    name: Joi.string(),
    email: Joi.string().email(),
    password: Joi.string(),
    active: Joi.boolean(),
    type: Joi.string().required(),
    address: Joi.string().required().custom(AddressValidator.validate),
    provider: Joi.string().required(),
    webauthn: Joi.object().optional(), //todo: type correctly this
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

export const FindUserByIDParams = validator.params(
  Joi.object({
    id: Joi.string().uuid(),
  }),
);

export const ListUserTransactionsQuerySchema = validator.query(
  Joi.object({
    offsetDb: Joi.string().optional().default('0'),
    offsetFuel: Joi.string().optional().default('0'),
    perPage: Joi.string().optional().default('5'),
  }),
);
