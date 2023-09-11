import { Column, Entity } from 'typeorm';

import { Base } from './Base';

@Entity('predicates')
class Predicate extends Base {
  @Column()
  name: string;

  @Column()
  address: string;

  @Column()
  description: string;

  @Column()
  minSigners: number;

  @Column('simple-json')
  addresses: string[];

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
}

export { Predicate };
