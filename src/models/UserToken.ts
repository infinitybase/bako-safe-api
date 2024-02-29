import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';

import { Base } from './Base';
import { User } from './User';
import { Workspace } from './Workspace';

export enum Encoder {
  FUEL = 'FUEL',
  METAMASK = 'FUEL',
  WEB_AUTHN = 'WEB_AUTHN',
}

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

  @Column()
  provider: string;

  @Column({ type: 'jsonb' })
  payload: string;

  @Column()
  expired_at?: Date;

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
