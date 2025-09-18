import { validator } from '@src/utils';
import Joi from 'joi';

export const ValidatorDestinationParams = validator.query(
  Joi.object({
    from_network: Joi.string().required(),
    from_token: Joi.string().required(),
  }),
);

export const ValidatorLimitsParams = validator.query(
  Joi.object({
    destination_address: Joi.string().optional(),
    source_network: Joi.string().required(),
    source_token: Joi.string().required(),
    destination_network: Joi.string().required(),
    destination_token: Joi.string().required(),
  }),
);

export const ValidatorQuotesParams = validator.query(
  Joi.object({
    destination_address: Joi.string().optional(),
    source_network: Joi.string().required(),
    source_token: Joi.string().required(),
    destination_network: Joi.string().required(),
    destination_token: Joi.string().required(),
    amount: Joi.string().required(),
  }),
);

export const ValidatorCreateSwapRequest = validator.body(
  Joi.object({
    destination_address: Joi.string().required(),
    source_network: Joi.string().required(),
    source_token: Joi.string().required(),
    destination_network: Joi.string().required(),
    destination_token: Joi.string().required(),
    amount: Joi.number().required(),
    refuel: Joi.boolean().required(),
    use_deposit_address: Joi.boolean().required(),
    use_new_deposit_address: Joi.string().optional().allow(null),
    reference_id: Joi.string().optional().allow(null),
    source_address: Joi.string().optional().allow(null),
    slippage: Joi.string().optional().allow(null),
  }),
);
