import { Column, Entity, JoinTable, ManyToMany, OneToMany } from 'typeorm';

import { Base } from './Base';
import { Transaction } from './Transaction';
import { User } from './User';

export interface PredicateMember {
  avatar: string;
  address: string;
}

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

  @ManyToMany(() => User)
  @JoinTable({
    name: 'predicate_members',
    joinColumn: { name: 'predicate_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  members: User[];
}

export { Predicate };
