import Joi from 'joi';

import { validator } from '@utils/index';
import { Address } from 'fuels';

export const validateAddPredicatePayload = validator.body(
  Joi.object({
    name: Joi.string().required(),
    description: Joi.string().allow('').optional(),
    predicateAddress: Joi.string()
      .required()
      .custom((value, helpers) => {
        try {
          const address = Address.fromString(value);
          return address.toB256();
        } catch (error) {
          return helpers.message({ custom: 'Invalid address' });
        }
      }),
    minSigners: Joi.number().strict(true).integer().min(1).required(),
    addresses: Joi.array()
      .items(Joi.string())
      .min(1)
      .required()
      .custom((value, helpers) => {
        const addresses = value.map(address => {
          try {
            const addressInstance = Address.fromString(address);
            return addressInstance.toB256();
          } catch (error) {
            return helpers.message({ custom: 'Invalid address' });
          }
        });

        return addresses;
      }),
    configurable: Joi.string().required(),
    provider: Joi.string().required(),
    chainId: Joi.number().strict(true),
    versionCode: Joi.string().optional(),
  }),
);
