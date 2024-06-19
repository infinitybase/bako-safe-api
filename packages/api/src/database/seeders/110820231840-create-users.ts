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
    await new UserService().create({
      name: user.name,
      type: user.type,
      address: user.address,
      provider: user.provider,
    });
  }
}
