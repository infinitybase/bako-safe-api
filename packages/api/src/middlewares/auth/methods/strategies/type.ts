import { Request } from 'express';

import { User, Workspace, DApp } from '@src/models';
import { Network } from 'fuels';

export type IValidatePathParams = { method: string; path: string };

export interface AuthStrategy {
  authenticate(
    req: Request,
  ): Promise<{ user: User; workspace: Workspace; network: Network; dapp?: DApp }>;
}
