import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';

import { Base } from './Base';
import { Transaction } from './Transaction';
import { User } from './User';
import { Workspace } from './Workspace';
import { PredicateVersion } from './PredicateVersion';

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

  @Column({ nullable: true })
  description?: string;

  @Column()
  minSigners: number;

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

  @JoinColumn({ name: 'owner_id' })
  @OneToOne(() => User)
  owner: User;

  @JoinColumn({ name: 'workspace_id' })
  @ManyToOne(() => Workspace, workspace => workspace.predicates)
  workspace: Workspace;

  @OneToMany(() => Transaction, transaction => transaction.predicate)
  transactions: Transaction[];

  @ManyToMany(() => User)
  @JoinTable({
    name: 'predicate_members',
    joinColumn: { name: 'predicate_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  members: User[];

  @JoinColumn({ name: 'version_id' })
  @ManyToOne(() => PredicateVersion, { nullable: true })
  version: PredicateVersion;
}

export { Predicate };
