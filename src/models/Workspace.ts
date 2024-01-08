import {
  BeforeInsert,
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

/**
 * PERMISSIONS TYPING
 */
export enum PermissionRoles {
  SIGNER = 'SIGNER',
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  VIEWER = 'VIEWER',
}

export const defaultPermissions = {
  [PermissionRoles.OWNER]: {
    SIGNER: ['*'],
    OWNER: ['*'],
    ADMIN: ['*'],
    VIEWER: ['*'],
  },
  [PermissionRoles.VIEWER]: {
    VIEWER: ['*'],
  },
};

export interface IPermissions {
  [key: string]: {
    [key in PermissionRoles]: string[];
  };
}
/**
 * PERMISSIONS TYPING
 */

@Entity('workspace')
class Workspace extends Base {
  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  avatar: string;

  @JoinColumn({ name: 'owner_id' })
  @OneToOne(() => User)
  owner: User;

  @Column() // if true, the workspace is a single workspace
  single: boolean;

  @Column({
    name: 'permissions',
    type: 'jsonb',
  })
  permissions: IPermissions;

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

  @BeforeInsert()
  async isSingle() {
    if (this.members && this.members.length > 1) {
      this.single = false;
    } else {
      this.single = true;
    }
  }
}

export { Workspace };
