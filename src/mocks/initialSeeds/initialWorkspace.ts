import { randomBytes } from 'crypto';

import { User } from '@src/models';
import { PermissionRoles, Workspace } from '@src/models/Workspace';
import { UserService } from '@src/modules/user/service';

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
