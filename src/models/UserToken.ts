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

export enum Encoders {
  FUEL = 'fuel',
  METAMASK = 'metamask',
}

@Entity('user_tokens')
class UserToken extends Base {
  @Column()
  token: string;

  @Column()
  encoder: Encoders;

  @Column()
  provider: string;

  @Column()
  expired_at?: Date;

  @JoinColumn({ name: 'user_id' })
  @OneToOne(() => User)
  user: User;

  @BeforeInsert()
  @BeforeUpdate()
  async encryptToken() {
    if (this.token) {
      this.token = await EncryptUtils.encryptToken(this.token);
    }
  }
}

export default UserToken;
