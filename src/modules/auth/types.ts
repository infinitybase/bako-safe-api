import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';

import { AuthValidatedRequest } from '@src/middlewares/auth/types';

import { User } from '@models/index';

export interface ISignInPayload {
  email: string;
  password: string;
}

interface ISignInRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: ISignInPayload;
}

export interface ISignInResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface IAuthWithRefreshTokenRequestSchema extends ValidatedRequestSchema {
  [ContainerTypes.Body]: {
    refreshToken: string;
  };
}

export interface IAuthWithRefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export type ISignInRequest = AuthValidatedRequest<ISignInRequestSchema>;

export type IAuthWithRefreshTokenRequest = AuthValidatedRequest<IAuthWithRefreshTokenRequestSchema>;

export interface IAuthService {
  signIn(payload: ISignInPayload): Promise<ISignInResponse>;
  signOut(user: User): Promise<void>;
  authWithRefreshToken(
    refreshToken: string,
  ): Promise<IAuthWithRefreshTokenResponse>;
}
