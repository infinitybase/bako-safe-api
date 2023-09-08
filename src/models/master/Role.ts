import { Column, Entity } from 'typeorm';

import { Modules } from '@src/middlewares/permissions/types';

import ByMaster from './ByMaster';

export type PermissionsItem = {
  view: boolean;
  edit: boolean;
  remove: boolean;
};

export type Permissions = { [K in Modules]: PermissionsItem };

@Entity('roles')
class Role extends ByMaster {
  @Column()
  name: string;

  @Column({ default: true })
  active: boolean;

  @Column('simple-json')
  permissions: Permissions;
}

export default Role;
