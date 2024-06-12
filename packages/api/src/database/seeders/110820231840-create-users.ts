import { generateInitialUsers } from '@src/mocks/initialSeeds/initialUsers';
import {
  PermissionRoles,
  Workspace,
  defaultPermissions,
} from '@src/models/Workspace';
import { UserService } from '@src/modules/user/service';

import { User } from '@models/index';
import { IconUtils } from '@utils/icons';

export default async function () {
  const users = await generateInitialUsers();
  for await (const user of users) {
    const _user = await User.create(user)
      .save()
      .then(async _ => {
        return await User.findOne({
          order: {
            createdAt: 'DESC',
          },
        });
      });

    await Workspace.create({
      name: `singleWorkspace[${_user.id}]`,
      owner: _user,
      permissions: {
        [_user.id]: defaultPermissions[PermissionRoles.OWNER],
      },
      members: [_user],
      avatar: IconUtils.workspace(),
      single: true,
    }).save();
  }
}
