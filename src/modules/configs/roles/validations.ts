import Joi from 'joi';

import { validator } from '@utils/index';

const PermissionSchema = Joi.object({
  view: Joi.boolean().required(),
  edit: Joi.boolean().required(),
  remove: Joi.boolean().required(),
}).required();

const PermissionsSchema = Joi.object({
  configs: PermissionSchema,
  roles: PermissionSchema,
}).required();

export const PayloadRoleSchema = validator.body(
  Joi.object({
    name: Joi.string().required(),
    active: Joi.boolean().required(),
    permissions: PermissionsSchema,
  }),
);
