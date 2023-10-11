import { accounts } from '@src/mocks/accounts';
import { netoworks } from '@src/mocks/networks';
import Role from '@src/models/Role';

import { Languages, User } from '@models/index';

export default async function () {
  const roles = await Role.find({
    where: [{ name: 'Administrador' }],
    order: { name: 'ASC' },
  });

  if (roles.length < 1) {
    return;
  }

  const users: Partial<User>[] = [
    {
      name: `[${netoworks['local']}] ${accounts['STORE']}`,
      active: true,
      email: process.env.APP_ADMIN_EMAIL,
      password: process.env.APP_ADMIN_PASSWORD,
      language: Languages.PORTUGUESE,
      provider: netoworks['local'],
      address: accounts['STORE'].address,
      role: roles[0],
    },

    {
      name: `[${netoworks['local']}] ${accounts['USER_1']}`,
      active: true,
      email: process.env.APP_ADMIN_EMAIL,
      password: process.env.APP_ADMIN_PASSWORD,
      language: Languages.PORTUGUESE,
      provider: netoworks['local'],
      address: accounts['USER_1'].address,
      role: roles[0],
    },

    {
      name: `[${netoworks['local']}] ${accounts['USER_2']}`,
      active: true,
      email: process.env.APP_ADMIN_EMAIL,
      password: process.env.APP_ADMIN_PASSWORD,
      language: Languages.PORTUGUESE,
      provider: netoworks['local'],
      address: accounts['USER_2'].address,
      role: roles[0],
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
