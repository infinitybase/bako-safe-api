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

export interface PredicateMember {
  avatar: string;
  address: string;
}

// todo: use default by bako-sdk
export const DEFAULT_BAKO_PREDICATE_VERSION =
  '0x0ec304f98efc18964de98c63be50d2360572a155b16bcb0f3718c685c70a00aa';

@Entity('predicates')
class Predicate extends Base {
  @Column()
  name: string;

  @Column({ name: 'predicate_address' })
  predicateAddress: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  configurable: string;

  // if true is the root wallet of user
  @Column({ nullable: true, default: false })
  root: boolean;

  @Column({
    name: 'version',
    default: DEFAULT_BAKO_PREDICATE_VERSION,
  })
  version: string;

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
}

export { Predicate };

// -- Criação de índice para a coluna 'owner_id' na tabela 'predicates'
// CREATE INDEX idx_predicates_owner_id ON predicates(owner_id);

// -- Criação de índice para a coluna 'workspace_id' na tabela 'predicates'
// CREATE INDEX idx_predicates_workspace_id ON predicates(workspace_id);

// -- Criação de índice para a coluna 'version_id' na tabela 'predicates'
// CREATE INDEX idx_predicates_version_id ON predicates(version_id);
