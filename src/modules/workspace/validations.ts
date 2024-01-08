import Joi from 'joi';

import { Languages } from '@src/models';

import { validator } from '@utils/index';

export const PayloadCreateWorkspaceSchema = validator.body(
  Joi.object({
    name: Joi.string().required(),
    members: Joi.array().items(Joi.string()).optional(),
    description: Joi.string().optional(),
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

export const PayloadUpdateMembersWorkspaceSchema = validator.body(
  Joi.object({
    members: Joi.array().items(Joi.string()).required(),
  }),
);

export const PayloadUpdatePermissionsWorkspaceSchema = validator.body(
  Joi.object({
    permissions: Joi.object().required(),
  }),
);
