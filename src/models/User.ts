import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToOne,
} from 'typeorm';

import { EncryptUtils } from '@utils/index';

import { Base } from './Base';
import Role from './Role';
import UserToken from './UserToken';

const { UI_URL } = process.env;

export enum Languages {
  ENGLISH = 'English',
  PORTUGUESE = 'Portuguese',
}

@Entity('users')
class User extends Base {
  @Column()
  name?: string;

  @Column({ default: true })
  active: boolean;

  @Column()
  email?: string;

  @Column({ select: false })
  password?: string;

  @Column()
  provider: string;

  @Column()
  address: string;

  @Column({ enum: Languages })
  language?: Languages;

  @JoinColumn({ name: 'role_id' })
  @ManyToOne(() => Role)
  role: Role;

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
