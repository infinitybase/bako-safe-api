import { BeforeInsert, BeforeUpdate, Column, Entity } from 'typeorm';

import { EncryptUtils } from '@utils/index';

import { Base } from './Base';

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
