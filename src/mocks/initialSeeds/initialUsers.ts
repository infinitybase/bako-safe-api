import { User, Languages } from '@src/models';
import { UserService } from '@src/modules/user/service';

import { accounts } from '../accounts';
import { networks } from '../networks';

export const generateInitialUsers = async (): Promise<Partial<User>[]> => {
  const userService = new UserService();

  const user1: Partial<User> = {
    name: `[${networks['local']}] ${accounts['STORE'].account}`,
    active: true,
    email: process.env.APP_ADMIN_EMAIL || '',
    password: process.env.APP_ADMIN_PASSWORD || '',
    provider: networks['local'],
    address: accounts['STORE'].address,
    language: Languages.PORTUGUESE,
    avatar: await userService.randomAvatar(),
  };

  const user2: Partial<User> = {
    name: `[${networks['local']}] ${accounts['USER_1'].account}`,
    active: true,
    email: process.env.APP_ADMIN_EMAIL || '',
    password: process.env.APP_ADMIN_PASSWORD || '',
    language: Languages.PORTUGUESE,
    provider: networks['local'],
    address: accounts['USER_1'].address,
    avatar: await userService.randomAvatar(),
  };

  const user3: Partial<User> = {
    name: `[${networks['local']}] ${accounts['USER_2'].account}`,
    active: true,
    email: process.env.APP_ADMIN_EMAIL || '',
    password: process.env.APP_ADMIN_PASSWORD || '',
    language: Languages.PORTUGUESE,
    provider: networks['local'],
    address: accounts['USER_2'].address,
    avatar: await userService.randomAvatar(),
  };

  return [user1, user2, user3];
};
