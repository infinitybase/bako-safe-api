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
  INVALID_CREDENTIALS = 'Invalid credentials',
  ACCESS_TOKEN_NOT_PROVIDED = 'Access token not provided',
  INVALID_ACCESS_TOKEN = 'Invalid access token',
  ACCESS_TOKEN_EXPIRED = 'Access token expired',
  INVALID_REFRESH_TOKEN = 'Invalid refresh token',
  REFRESH_TOKEN_EXPIRED = 'Refresh token expired',
  INVALID_PERMISSION = 'Invalid permission',
}

interface UnauthorizedError extends Omit<Error, 'title'> {
  title: UnauthorizedErrorTitles;
}

// -> retornado quando o usuário nao está autenticado
class Unauthorized extends GeneralError {
  constructor(error: UnauthorizedError | UnauthorizedError[]) {
    super(error, 401);
  }
}

export default Unauthorized;
