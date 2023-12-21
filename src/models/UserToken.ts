import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';

import { Base } from './Base';
import { User } from './User';
import { Workspace } from './Workspace';

export enum Encoder {
  fuel = 'fuel',
  metamask = 'metamask',
}

@Entity('user_tokens')
class UserToken extends Base {
  @Column()
  token: string;

  @Column()
  encoder: Encoder;

  @Column()
  provider: string;

  @Column()
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
