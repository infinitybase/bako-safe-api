import Joi from 'joi';

import { AddressValidator, validator } from '@utils/index';

export const PayloadCreateWorkspaceSchema = validator.body(
  Joi.object({
    name: Joi.string().required(),
    members: Joi.array()
      .items(
        Joi.alternatives().try(
          Joi.string().uuid(),
          Joi.string().custom(AddressValidator.validate),
        ),
      )
      .optional()
      .messages({
        'alternatives.match': 'Invalid member address or id',
      }),
    description: Joi.string().allow('').optional(),
    avatar: Joi.string().optional(),
    permissions: Joi.object({}).optional(),
  }),
);

export const PayloadUpdateWorkspaceSchema = validator.body(
  Joi.object({
    name: Joi.string().optional(),
    avatar: Joi.string().optional(),
    description: Joi.string().optional(),
  }),
);

export const PayloadUpdateWorkspaceParams = validator.params(
  Joi.object({
    member: Joi.alternatives().try(
      Joi.string().uuid(),
      Joi.string().custom(AddressValidator.validate),
    ),
  }),
);

export const PayloadUpdatePermissionsWorkspaceSchema = validator.body(
  Joi.object({
    permissions: Joi.object().required(),
  }),
);
