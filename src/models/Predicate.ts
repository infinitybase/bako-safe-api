import { AfterLoad, BeforeInsert, Column, Entity } from 'typeorm';

import { Base } from './Base';

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
  network: string;

  @Column({ nullable: true })
  chainId?: number;

  @BeforeInsert()
  saveAsJson() {
    if (typeof this.addresses !== 'string') {
      this.addresses = JSON.stringify(this.addresses);
    }
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
