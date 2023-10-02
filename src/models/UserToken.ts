import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  JoinColumn,
  OneToOne,
} from 'typeorm';

import { EncryptUtils } from '@utils/index';

import { Base } from './Base';
import { User } from './User';

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

  @Column()
  user_id: string;

  @JoinColumn({ name: 'user_id' })
  @OneToOne(() => User)
  user: User;
}

export default UserToken;
