import GeneralError from '@utils/error/GeneralError';

export { default as BadRequest } from './BadRequest';
export * from './Forbidden';
export * from './GeneralError';
export { default as Internal } from './Internal';
export { default as NotFound } from './NotFound';
export * from './Unauthorized';

export enum Responses {
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  Internal = 500,
}

export interface ErrorResponse {
  error: Error | GeneralError;
  statusCode: Responses;
}

const error = (
  payload: Error | GeneralError,
  statusCode: Responses = Responses.Internal,
): ErrorResponse => {
  console.log(`[ERROR]`, payload);
  if (payload && 'detail' in payload && process.env.NODE_ENV !== 'development') {
    payload.detail = null;
  }

  return {
    error: payload,
    statusCode,
  };
};

export { error };
