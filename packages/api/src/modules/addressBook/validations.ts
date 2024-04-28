import Joi from 'joi';

import { validator } from '@utils/index';

export const validateCreateAddressBookPayload = validator.body(
  Joi.object({
    nickname: Joi.string().required(),
    address: Joi.string().required(),
  }),
);

export const validateUpdateAddressBookPayload = validator.body(
  Joi.object({
    id: Joi.string().required(),
    nickname: Joi.string().required(),
    address: Joi.string().required(),
  }),
);
