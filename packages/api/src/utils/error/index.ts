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

export interface ErrorResponse<T> {
  payload: T;
  statusCode: Responses;
}

const error = <ResponsePayload extends GeneralError | Error>(
  payload: ResponsePayload,
  statusCode: Responses = Responses.Internal,
): ErrorResponse<ResponsePayload> => {
  if (payload instanceof GeneralError) {
    console.log(`[ERROR]`, payload);
    if (payload && 'detail' in payload && process.env.NODE_ENV !== 'development') {
      payload.detail = null;
    }

    return {
      payload,
      statusCode,
    };
  }

  return {
    payload,
    statusCode: Responses.Internal,
  };
};

export { error };
