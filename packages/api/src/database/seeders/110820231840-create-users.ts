import { generateInitialUsers } from '@src/mocks/initialSeeds/initialUsers';

import { UserService } from '@src/modules/user/service';

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
