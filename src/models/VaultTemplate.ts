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
  addresses: string;

  @JoinColumn({ name: 'created_by' })
  @OneToOne(() => User)
  createdBy: User;

  @BeforeInsert()
  saveAsJson() {
    if (typeof this.addresses !== 'string') {
      this.addresses = JSON.stringify(this.addresses);
    }
  }

  @AfterInsert()
  returnParsedOnSave() {
    this.addresses = JSON.parse(this.addresses);
  }

  @AfterLoad()
  returnParsed() {
    this.addresses = JSON.parse(this.addresses);
  }
}

export default UserToken;
