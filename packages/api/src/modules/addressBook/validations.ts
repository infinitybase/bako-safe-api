import Joi from 'joi';

import { AddressValidator, validator } from '@utils/index';

export const validateCreateAddressBookPayload = validator.body(
  Joi.object({
    nickname: Joi.string().required(),
    address: Joi.string().required().custom(AddressValidator.validate),
  }),
);

export const validateUpdateAddressBookPayload = validator.body(
  Joi.object({
    id: Joi.string().required(),
    nickname: Joi.string().required(),
    address: Joi.string().required(),
  }),
);
