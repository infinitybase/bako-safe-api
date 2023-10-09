import {
  AfterInsert,
  AfterLoad,
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  OneToOne,
} from 'typeorm';

import { Base } from './Base';
import { User } from './User';

@Entity('vault_template')
class UserToken extends Base {
  @Column()
  name: string;

  @Column()
  description: string;

  @Column({ name: 'min_signers' })
  minSigners: number;

  @Column()
  signers: string;

  @JoinColumn({ name: 'created_by' })
  @OneToOne(() => User)
  createdBy: User;

  @BeforeInsert()
  saveAsJson() {
    if (typeof this.signers !== 'string') {
      this.signers = JSON.stringify(this.signers);
    }
  }

  @AfterInsert()
  returnParsedOnSave() {
    this.signers = JSON.parse(this.signers);
  }

  @AfterLoad()
  returnParsed() {
    this.signers = JSON.parse(this.signers);
  }
}

export default UserToken;
