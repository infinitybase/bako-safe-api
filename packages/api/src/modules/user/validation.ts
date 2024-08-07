import Joi from 'joi';

import { validator } from '@utils/index';
import { Address } from 'fuels';

export const PayloadCreateUserSchema = validator.body(
  Joi.object({
    name: Joi.string(),
    email: Joi.string().email(),
    password: Joi.string(),
    active: Joi.boolean(),
    type: Joi.string().required(),
    address: Joi.string()
      .required()
      .custom((value, helpers) => {
        try {
          const address = Address.fromString(value);
          return address.toB256();
        } catch (error) {
          return helpers.message({ custom: 'Invalid address' });
        }
      }),
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
