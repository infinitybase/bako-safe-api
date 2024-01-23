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

import AddressBook from './AddressBook';
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
  OWNER = 'OWNER', // owner of the workspace, THIS ROLE CAN'T BE CHANGED
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  SIGNER = 'SIGNER',
  VIEWER = 'VIEWER',
}

//todo: change to specific permissions of each role depends the complete flow
export const defaultPermissions = {
  [PermissionRoles.OWNER]: {
    OWNER: ['*'],
    ADMIN: ['*'],
    MANAGER: ['*'],
    SIGNER: ['*'],
    VIEWER: ['*'],
  },
  [PermissionRoles.ADMIN]: {
    OWNER: [''],
    ADMIN: [''],
    MANAGER: [''],
    SIGNER: [''],
    VIEWER: [''],
  },
  [PermissionRoles.MANAGER]: {
    OWNER: [''],
    ADMIN: [''],
    MANAGER: [''],
    SIGNER: [''],
    VIEWER: [''],
  },
  [PermissionRoles.SIGNER]: {
    OWNER: [''],
    ADMIN: [''],
    MANAGER: [''],
    SIGNER: [''],
    VIEWER: [''],
  },
  [PermissionRoles.VIEWER]: {
    OWNER: [''],
    ADMIN: [''],
    MANAGER: [''],
    SIGNER: [''],
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
  @OneToOne(() => User, { cascade: true })
  owner: User;

  @Column() // if true, the workspace is a single workspace
  single: boolean;

  @Column({
    name: 'permissions',
    type: 'jsonb',
  })
  permissions: IPermissions;

  @JoinColumn()
  @OneToMany(() => Predicate, predicate => predicate.workspace, { cascade: true })
  predicates: Predicate[];

  @JoinColumn({ name: 'address_book' })
  @OneToMany(() => AddressBook, adb => adb.owner, { cascade: true })
  addressBook: AddressBook[];

  @ManyToMany(() => User, { cascade: true })
  @JoinTable({
    name: 'workspace_users',
    joinColumn: { name: 'workspace_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  members: User[];
}

export { Workspace };
