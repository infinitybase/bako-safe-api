import { validator } from '@src/utils';
import Joi from 'joi';

export const ValidatorDestinationParams = validator.query(
  Joi.object({
    fromNetwork: Joi.string().required(),
    fromToken: Joi.string().required(),
  }),
);

export const ValidatorLimitsParams = validator.query(
  Joi.object({
    destinationAddress: Joi.string().optional(),
    sourceNetwork: Joi.string().required(),
    sourceToken: Joi.string().required(),
    destinationNetwork: Joi.string().required(),
    destinationToken: Joi.string().required(),
  }),
);

export const ValidatorQuotesParams = validator.query(
  Joi.object({
    destinationAddress: Joi.string().optional(),
    sourceNetwork: Joi.string().required(),
    sourceToken: Joi.string().required(),
    destinationNetwork: Joi.string().required(),
    destinationToken: Joi.string().required(),
    amount: Joi.string().required(),
  }),
);

export const ValidatorCreateSwapRequest = validator.body(
  Joi.object({
    destinationAddress: Joi.string().required(),
    sourceNetwork: Joi.string().required(),
    sourceToken: Joi.string().required(),
    destinationNetwork: Joi.string().required(),
    destinationToken: Joi.string().required(),
    amount: Joi.number().required(),
    refuel: Joi.boolean().required(),
    useDepositAddress: Joi.boolean().required(),
    useNewDepositAddress: Joi.string().optional().allow(null),
    referenceId: Joi.string().optional().allow(null),
    sourceAddress: Joi.string().optional().allow(null),
    slippage: Joi.string().optional().allow(null),
  }),
);
