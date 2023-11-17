import { generateInitialUsers } from '@src/mocks/initialSeeds/initialUsers';

import { User } from '@models/index';

export default async function () {
  const existingUsers = (await User.find()).length >= 3;

  if (existingUsers) {
    return;
  }
  const users = await generateInitialUsers();
  for await (const user of users) {
    await User.create(user).save();
  }
}
