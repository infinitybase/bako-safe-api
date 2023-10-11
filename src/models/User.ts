import axios from 'axios';
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
  avatar?: string;

  @BeforeInsert()
  @BeforeUpdate()
  async encryptPassword() {
    if (this.password) {
      this.password = await EncryptUtils.encrypt(this.password);
    }
    if (!this.avatar) {
      const avatars_json = await axios
        .get(`${UI_URL}/icons/icons.json`)
        .then(({ data }) => data);
      const avatars = avatars_json.values;
      const random = Math.floor(Math.random() * avatars.length);
      this.avatar = `${UI_URL}/${avatars[random]}`;
    }
  }
}

export { User };
