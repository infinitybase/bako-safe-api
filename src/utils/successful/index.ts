export enum Responses {
  Ok = 200,
  Created = 201,
  Accepted = 202,
  NonAuthoritative = 203,
  NoContent = 204,
  ResetContent = 205,
  PartialContent = 206,
}

export interface SuccessResponse<T> {
  payload: T;
  statusCode: Responses;
}

const successful = <ResponsePayload>(
  payload: ResponsePayload,
  statusCode = Responses.Ok,
): SuccessResponse<ResponsePayload> => ({
  payload,
  statusCode,
});

export { successful };
