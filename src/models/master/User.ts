import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

import EncryptUtils from '@src/utils/EncryptUtils';

import ByMaster from './ByMaster';
import Role from './Role';

export enum Languages {
  ENGLISH = 'English',
  PORTUGUESE = 'Portuguese',
}

@Entity('users')
class User extends ByMaster {
  @Column()
  name: string;

  @Column({ default: true })
  active: boolean;

  @Column()
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ enum: Languages })
  language: Languages;

  @JoinColumn({ name: 'role_id' })
  @ManyToOne(() => Role)
  role: Role;

  @BeforeInsert()
  @BeforeUpdate()
  async encryptPassword() {
    if (this.password) {
      this.password = await EncryptUtils.encrypt(this.password);
    }
  }
}

export default User;
