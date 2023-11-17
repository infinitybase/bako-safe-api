import {
  AfterLoad,
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToOne,
} from 'typeorm';

import { Base } from './Base';
import { User } from './User';

@Entity('vault_template')
class VaultTemplate extends Base {
  @Column()
  name: string;

  @Column()
  description: string;

  @Column({ name: 'min_signers' })
  minSigners: number;

  @JoinColumn({ name: 'created_by' })
  @OneToOne(() => User)
  createdBy: User;

  @ManyToMany(() => User)
  @JoinTable({
    name: 'vault_template_members',
    joinColumn: { name: 'template_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  addresses: User[] | string[];

  @AfterLoad()
  returnArrayOfAddresses() {
    if (Array.isArray(this.addresses)) {
      this.addresses = (this.addresses as User[]).map(a =>
        typeof a === 'string' ? a : a.address,
      );
    }
  }
}

export default VaultTemplate;
