import { DApp } from '@src/models';

import { User } from '@models/index';

export default async function () {
  const dapps = await DApp.find();
  if (dapps.length) {
    return;
  }

  const users = await User.find({
    where: [
      {
        email: process.env.APP_ADMIN_EMAIL,
      },
    ],
  });
  if (!users.length) {
    return;
  }

  await DApp.create({
    sessionId: 'sessionId',
    name: 'name',
    url: 'url',
    users: users,
  }).save();
}
