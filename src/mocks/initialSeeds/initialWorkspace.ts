import { randomBytes } from 'crypto';

import { User } from '@src/models';
import {
  PermissionRoles,
  Workspace,
  defaultPermissions,
} from '@src/models/Workspace';
import { UserService } from '@src/modules/user/service';

import { accounts } from '../accounts';

export const generateInitialWorkspace = async (): Promise<Workspace> => {
  const members = await User.find({
    take: 3,
    order: {
      createdAt: 'ASC',
    },
  });
  return Workspace.create({
    name: randomBytes(10).toString('hex'),
    description: `Description ${randomBytes(10).toString('hex')}`,
    avatar: await new UserService().randomAvatar(),
    members,
    owner: members[0],
    permissions: {
      [members[0].id]: {
        [PermissionRoles.ADMIN]: ['*'],
        [PermissionRoles.OWNER]: ['*'],
        [PermissionRoles.VIEWER]: ['*'],
        [PermissionRoles.SIGNER]: ['*'],
      },
      [members[1].id]: {
        [PermissionRoles.ADMIN]: ['*'],
        [PermissionRoles.VIEWER]: ['*'],
        [PermissionRoles.SIGNER]: ['*'],
      },
      [members[2].id]: {
        [PermissionRoles.VIEWER]: ['*'],
        [PermissionRoles.SIGNER]: ['*'],
      },
    },
  });
};

export const generateInitialAuxWorkspace = async (): Promise<Workspace> => {
  const members = await User.find({
    take: 3,
    order: {
      createdAt: 'ASC',
    },
  });

  const acc_1 = members.find(m => m.address === accounts['USER_1'].address);
  const non_acc = members.filter(m => m.address !== accounts['USER_1'].address);

  return Workspace.create({
    name: `[INITIAL]${randomBytes(10).toString('hex')}`,
    description: `Description ${randomBytes(10).toString('hex')}`,
    avatar: await new UserService().randomAvatar(),
    members,
    owner: members[0],
    permissions: {
      [acc_1.id]: defaultPermissions[PermissionRoles.VIEWER],
      [non_acc[0].id]: defaultPermissions[PermissionRoles.OWNER],
      [non_acc[1].id]: defaultPermissions[PermissionRoles.OWNER],
    },
  });
};
