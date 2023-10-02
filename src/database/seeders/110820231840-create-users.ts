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
      name: 'Administrador',
      active: true,
      email: process.env.APP_ADMIN_EMAIL,
      password: process.env.APP_ADMIN_PASSWORD,
      language: Languages.PORTUGUESE,
      provider: 'provider',
      address: 'fuel14yleyeny9pm60ezpmm3s28z34h4f7jk9z2u3l69u6am',
      role: roles[0],
    },
  ];

  const existingUsers = await User.find({
    where: [
      { email: users[0].email },
      //  { email: users[1].email }
    ],
  });

  if (existingUsers.length > 0) {
    return;
  }

  for await (const user of users) {
    await User.create(user).save();
  }
}
