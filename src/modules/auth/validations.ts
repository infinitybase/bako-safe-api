import Joi from 'joi';

import { Encoder } from '@src/models';

import { validator } from '@utils/index';

const allowedEncoders = Object.values(Encoder);

export const validateSignInPayload = validator.body(
  Joi.object({
    address: Joi.string().required(),
    hash: Joi.string().required(),
    createdAt: Joi.date().required(),
    provider: Joi.string().required(),
    signature: Joi.string().required(),
    user_id: Joi.string().required(),
    encoder: Joi.string()
      .required()
      .valid(...allowedEncoders),
  }),
);

export const validateSignInDappPayload = validator.body(
  Joi.object({
    sessionId: Joi.string().required(),
    url: Joi.string().required(),
    name: Joi.string().optional(),
    address: Joi.string().required(),
  }),
);
