import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  JoinColumn,
  OneToOne,
} from 'typeorm';

import EncryptUtils from '@src/utils/EncryptUtils';

import ByMaster from './ByMaster';
import User from './User';

@Entity('user_tokens')
class UserToken extends ByMaster {
  @Column()
  token: string;

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
