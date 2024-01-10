import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

import { EncryptUtils } from '@utils/index';

import { Base } from './Base';
import Role from './Role';

export enum Languages {
  ENGLISH = 'English',
  PORTUGUESE = 'Portuguese',
}

@Entity('users')
class User extends Base {
  @Column()
  name?: string;

  @Column({ default: true })
  first_login: boolean;

  @Column({ default: false })
  notify: boolean;

  @Column({ default: true })
  active: boolean;

  @Column({ select: false })
  email?: string;

  @Column({ select: false })
  password?: string;

  @Column()
  provider: string;

  @Column()
  address: string;

  @Column({ enum: Languages })
  language?: Languages;

  @Column()
  avatar: string;

  @BeforeInsert()
  @BeforeUpdate()
  async encryptPassword() {
    if (this.password) {
      this.password = await EncryptUtils.encrypt(this.password);
    }
  }
}

export { User };
