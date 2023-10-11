import {
  AfterInsert,
  AfterLoad,
  BeforeInsert,
  Column,
  Entity,
  OneToMany,
} from 'typeorm';

import { Base } from './Base';
import { Transaction } from './Transaction';

@Entity('predicates')
class Predicate extends Base {
  @Column()
  name: string;

  @Column()
  predicateAddress: string;

  @Column()
  description: string;

  @Column()
  minSigners: number;

  @Column()
  addresses: string;

  @Column()
  owner: string;

  @Column()
  bytes: string;

  @Column()
  abi: string;

  @Column()
  configurable: string;

  @Column()
  provider: string;

  @Column({ nullable: true })
  chainId?: number;

  @OneToMany(() => Transaction, transaction => transaction.predicate)
  transactions: Transaction[];

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

  get AddressesArray() {
    return JSON.parse(this.addresses);
  }
}

export { Predicate };
