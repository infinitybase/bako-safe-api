import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';

import { Base } from './Base';
import { User } from './User';
import { Workspace } from './Workspace';
import { Network } from 'fuels';
import { networks } from '@src/constants/networks';

const { FUEL_PROVIDER, FUEL_PROVIDER_CHAIN_ID } = process.env;

/* eslint-disable @typescript-eslint/no-duplicate-enum-values */
export enum Encoder {
  FUEL = 'FUEL',
  METAMASK = 'FUEL', // Intentionally same as FUEL - uses same encoder
  WEB_AUTHN = 'WEB_AUTHN',
  EVM = 'EVM',
}
/* eslint-enable @typescript-eslint/no-duplicate-enum-values */

export interface IFuelTokenPayload {
  address: string;
  hash: string;
  createdAt: string;
  encoder: Encoder.FUEL;
  provider: string;
  user_id: string;
}

export interface IWebAuthnTokenPayload {
  id: string;
  publicKey: string;
  encoder: Encoder.WEB_AUTHN;
  provider: string;
  user_id: string;
}

@Entity('user_tokens')
class UserToken extends Base {
  @Column()
  token: string;

  @Column()
  encoder: Encoder;

  @Column({ type: 'jsonb' })
  payload: string;

  @Column({
    name: 'expired_at',
  })
  expired_at?: Date;

  @Column({
    type: 'jsonb',
    name: 'network',
    default: {
      url: FUEL_PROVIDER ?? networks['devnet'],
      chainId: Number(FUEL_PROVIDER_CHAIN_ID) ?? 0,
    },
  })
  network: Network;

  @JoinColumn({ name: 'workspace_id' })
  @OneToOne(() => Workspace)
  workspace: Workspace;

  @Column()
  user_id: string;

  @JoinColumn({ name: 'user_id' })
  @OneToOne(() => User)
  user: User;
}

export default UserToken;

// -- Criação de índice para a coluna 'workspace_id' na tabela 'user_tokens'
// CREATE INDEX idx_user_tokens_workspace_id ON user_tokens(workspace_id);

// -- Criação de índice para a coluna 'user_id' na tabela 'user_tokens'
// CREATE INDEX idx_user_tokens_user_id ON user_tokens(user_id);

// -- Criação de índice para a coluna 'encoder' na tabela 'user_tokens'
// CREATE INDEX idx_user_tokens_encoder ON user_tokens(encoder);

// -- Criação de índice para a coluna 'expired_at' na tabela 'user_tokens'
// CREATE INDEX idx_user_tokens_expired_at ON user_tokens(expired_at);
