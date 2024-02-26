import { Address } from 'fuels';
import {
  Column,
  Entity,
  BeforeUpdate,
  BeforeInsert,
  JoinColumn,
  OneToOne,
} from 'typeorm';

import { Base } from './Base';
import { User } from './User';

export enum RecoverCodeType {
  AUTH = 'AUTH',
}

@Entity('recover_codes')
class RecoverCode extends Base {
  @Column()
  origin: string;

  @JoinColumn({ name: 'owner' })
  @OneToOne(() => User)
  owner: User;

  @Column()
  type: RecoverCodeType;

  @Column()
  code: string;

  @Column({ name: 'valid_at' })
  validAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  insertCreatedAtAndUpdatedAt() {
    this.code = Address.fromRandom().toHexString();
  }
}

export { RecoverCode };
