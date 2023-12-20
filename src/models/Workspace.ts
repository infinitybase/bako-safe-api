import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToMany,
  OneToOne,
} from 'typeorm';

import { Base } from './Base';
import { Permission } from './Permissions';
import { Predicate } from './Predicate';
import { User } from './User';

/**
 * permissoes   -> MUITAS PERMISSOES <-> 1 WORKSPACE
 * vaults       -> MUITOS VAULTS <-> 1 WORKSPACE
 * book         -> MUITOS BOOKS <-> 1 WORKSPACE
 *
 * users        -> MUITOS USERS <-> MUITOS WORKSPACES
 */

@Entity('workspace')
class Workspace extends Base {
  @Column()
  name: string;

  @Column()
  description: string;

  @Column()
  avatar: string;

  @JoinColumn({ name: 'owner_id' })
  @OneToOne(() => User)
  owner: User;

  @OneToMany(() => Permission, permission => permission.workspace, {
    cascade: ['insert', 'update'],
  })
  permissions: Permission[];

  @OneToMany(() => Predicate, vault => vault.workspace, {
    cascade: ['insert', 'update'],
  })
  predicate: Predicate[];

  @ManyToMany(() => User)
  @JoinTable({
    name: 'predicate_members',
    joinColumn: { name: 'predicate_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  members: User[];
}

export { Workspace };
