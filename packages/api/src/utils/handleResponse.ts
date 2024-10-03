import Express from 'express';

import { ErrorResponse } from './error';
import { SuccessResponse } from './successful';

type ControllerEndpoint = (
  req: Express.Request,
  res: Express.Response,
  next: Express.NextFunction,
) => Promise<ErrorResponse<unknown> | SuccessResponse<unknown>>;

type ExpressRequest = (
  req: Express.Request,
  res: Express.Response,
  next: Express.NextFunction,
) => Promise<unknown>;

const handleResponse = (controllerEndpoint: ControllerEndpoint) => {
  const response: ExpressRequest = async function _handleResponse(req, res, next) {
    try {
      const result = await controllerEndpoint(req, res, next);
      /**
       * Check if we fired a "successful()" interface
       * Must have statusCode and payload properties.
       */
      if (result && result.statusCode) {
        return res.status(result.statusCode).json(result.payload);
      }

      /**
       * Let's return using a normal json.
       */
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  return response;
};

export { handleResponse };
