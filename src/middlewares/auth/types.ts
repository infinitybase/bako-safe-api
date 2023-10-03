import { Request } from 'express';
import { ContainerTypes, ValidatedRequestSchema } from 'express-joi-validation';
import { ParsedQs } from 'qs';

import { User } from '@models/index';

export interface AuthValidatedRequest<T extends ValidatedRequestSchema>
  extends Request {
  body: T[ContainerTypes.Body];
  query: T[ContainerTypes.Query] & ParsedQs;
  headers: T[ContainerTypes.Headers];
  params: T[ContainerTypes.Params];
  accessToken?: string;
  user?: User;
}

export type IAuthRequest = AuthValidatedRequest<ValidatedRequestSchema>;
