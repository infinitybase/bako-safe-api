import {
  BeforeUpdate,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm';

import { Base } from './Base';
import { User } from './User';
import { Workspace } from './Workspace';

export enum PermissionRoles {
  SIGNER = 'SIGNER',
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  VIEWER = 'VIEWER',
}

@Entity('permission')
class Permission extends Base {
  /**
   * {
   *  SIGNER: ['vault_id', 'vault_id', 'vault_id'],
   * }
   */
  @Column({
    name: 'roles',
    type: 'jsonb',
  })
  roles: {
    [key in PermissionRoles]: string[];
  };

  @JoinColumn({ name: 'owner_id' })
  @OneToOne(() => User)
  owner: User;

  @JoinColumn({ name: 'workspace_id' })
  @ManyToOne(() => Workspace, workspace => workspace.permissions)
  workspace: Workspace;
}

export { Permission };
