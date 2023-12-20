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
import { Predicate } from './Predicate';
import { User } from './User';

/**
 * vaults       -> MUITOS VAULTS <-> 1 WORKSPACE
 * book         -> MUITOS BOOKS <-> 1 WORKSPACE
 *
 * users        -> MUITOS USERS <-> MUITOS WORKSPACES
 */

export enum PermissionRoles {
  SIGNER = 'SIGNER',
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  VIEWER = 'VIEWER',
}

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

  @Column({
    name: 'permissions',
    type: 'jsonb',
  })
  permissions: {
    [key: string]: {
      [key in PermissionRoles]: string[];
    };
  };

  @OneToMany(() => Predicate, vault => vault.workspace, {
    cascade: true,
  })
  predicate: Predicate[];

  @ManyToMany(() => User)
  @JoinTable({
    name: 'workspace_users',
    joinColumn: { name: 'workspace_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  members: User[];
}

export { Workspace };
