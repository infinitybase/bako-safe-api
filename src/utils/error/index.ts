export { default as BadRequest } from './BadRequest';
export * from './GeneralError';
export { default as NotFound } from './NotFound';

export enum Responses {
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
}

export interface ErrorResponse<T> {
  payload: T;
  statusCode: Responses;
}

const error = <ResponsePayload>(
  payload: ResponsePayload,
  statusCode: Responses,
): ErrorResponse<ResponsePayload> => {
  console.log(payload);
  return {
    payload: payload,
    statusCode,
  };
};

export { error };
