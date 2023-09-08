import Role from '@src/models/master/Role';
import User, { Languages } from '@src/models/master/User';

export default async function () {
  const roles = await Role.find({
    where: [
      { name: 'Administrador' },
      // { name: 'Vendedor' }
    ],
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
      role: roles[0],
    },
    // {
    //   name: 'Vendedor',
    //   active: true,
    //   email: 'vendedor@netmore.com',
    //   password: 'vendedor123',
    //   language: Languages.PORTUGUESE,
    //   role: roles[1],
    // },
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
