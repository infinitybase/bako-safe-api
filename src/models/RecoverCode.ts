import crypto from 'crypto';
import { Column, Entity, BeforeUpdate, BeforeInsert } from 'typeorm';

import { Base } from './Base';

export enum RecoverCodeType {
  WEB_AUTHN_CREATE = 'WEB_AUTHN_CREATE',
}

@Entity('recover_codes')
class RecoverCode extends Base {
  @Column()
  origin: string;

  @Column()
  type: RecoverCodeType;

  @Column()
  code: string;

  @Column({ name: 'valid_at' })
  validAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  insertCreatedAtAndUpdatedAt() {
    this.code = crypto.randomUUID();
  }
}

export { RecoverCode };
