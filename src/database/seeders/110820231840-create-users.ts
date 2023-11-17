import { accounts } from '@src/mocks/accounts';
import { netoworks } from '@src/mocks/networks';
import Role from '@src/models/Role';
import { UserService } from '@src/modules/configs/user/service';

import { Languages, User } from '@models/index';

export default async function () {
  const roles = await Role.find({
    where: [{ name: 'Administrador' }],
    order: { name: 'ASC' },
  });

  if (roles.length < 1) {
    return;
  }
  const userService = new UserService();

  const users: Partial<User>[] = [
    {
      id: 'B8D94EFE-821B-4873-8D4B-A78A57F95BB5',
      name: `[${netoworks['local']}] ${accounts['STORE'].account}`,
      active: true,
      email: process.env.APP_ADMIN_EMAIL,
      password: process.env.APP_ADMIN_PASSWORD,
      language: Languages.PORTUGUESE,
      provider: netoworks['local'],
      address: accounts['STORE'].address,
      role: roles[0],
      avatar: await userService.randomAvatar(),
    },

    {
      name: `[${netoworks['local']}] ${accounts['USER_1'].account}`,
      active: true,
      email: process.env.APP_ADMIN_EMAIL,
      password: process.env.APP_ADMIN_PASSWORD,
      language: Languages.PORTUGUESE,
      provider: netoworks['local'],
      address: accounts['USER_1'].address,
      role: roles[0],
      avatar: await userService.randomAvatar(),
    },

    {
      name: `[${netoworks['local']}] ${accounts['USER_2'].account}`,
      active: true,
      email: process.env.APP_ADMIN_EMAIL,
      password: process.env.APP_ADMIN_PASSWORD,
      language: Languages.PORTUGUESE,
      provider: netoworks['local'],
      address: accounts['USER_2'].address,
      role: roles[0],
      avatar: await userService.randomAvatar(),
    },
  ];

  const existingUsers = await User.find({
    where: [{ email: users[0].email }],
  });

  if (existingUsers.length > 0) {
    return;
  }

  for await (const user of users) {
    await User.create(user).save();
  }
}
