import GeneralError, { Error } from './GeneralError';

export enum ErrorTypes {
  Create = 'CreateException',
  Update = 'UpdateException',
  Delete = 'DeleteException',
  NotFound = 'NotFound',
  Unauthorized = 'Unauthorized',
  Internal = 'Internal',
}

export enum UnauthorizedErrorTitles {
  MISSING_CREDENTIALS = 'Missing credentials',
  INVALID_CREDENTIALS = 'Invalid credentials',
  SESSION_NOT_FOUND = 'Session not found',
  ACCESS_TOKEN_NOT_PROVIDED = 'Access token not provided',
  MISSING_AUTH_PARAMS = 'Missing authentication params',
  INVALID_ADDRESS = 'Invalid address',
  INVALID_ACCESS_TOKEN = 'Invalid access token',
  EXPIRED_TOKEN = 'Expired token',
  INVALID_PERMISSION = 'Invalid permission',
}

export interface UnauthorizedError extends Omit<Error, 'title'> {
  title: UnauthorizedErrorTitles;
}

// -> retornado quando o usuário nao está autenticado
class Unauthorized extends GeneralError {
  constructor(error: UnauthorizedError) {
    super(error, 401);
  }
}

export { Unauthorized };
