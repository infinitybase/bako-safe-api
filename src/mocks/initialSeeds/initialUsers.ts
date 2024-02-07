import { User, Languages } from '@src/models';
import { UserService } from '@src/modules/user/service';

import { accounts } from '../accounts';
import { networks } from '../networks';

export const generateInitialUsers = async (): Promise<Partial<User>[]> => {
  const userService = new UserService();

  const user1: Partial<User> = {
    name: `[${networks['local']}] ${accounts['STORE'].address}`,
    active: true,
    email: process.env.APP_ADMIN_EMAIL || '',
    password: process.env.APP_ADMIN_PASSWORD || '',
    provider: networks['local'],
    address: accounts['STORE'].address,
    language: Languages.PORTUGUESE,
    avatar: await userService.randomAvatar(),
    createdAt: new Date(),
  };

  const user2: Partial<User> = {
    name: `[${networks['local']}] ${accounts['USER_1'].address}`,
    active: true,
    email: process.env.APP_ADMIN_EMAIL || '',
    password: process.env.APP_ADMIN_PASSWORD || '',
    language: Languages.PORTUGUESE,
    provider: networks['local'],
    address: accounts['USER_1'].address,
    avatar: await userService.randomAvatar(),
    createdAt: new Date(),
  };

  const user3: Partial<User> = {
    name: `[${networks['local']}] ${accounts['USER_2'].address}`,
    active: true,
    email: process.env.APP_ADMIN_EMAIL || '',
    password: process.env.APP_ADMIN_PASSWORD || '',
    language: Languages.PORTUGUESE,
    provider: networks['local'],
    address: accounts['USER_2'].address,
    avatar: await userService.randomAvatar(),
    createdAt: new Date(),
  };

  const user4: Partial<User> = {
    name: `[${networks['local']}] ${accounts['USER_3'].address}`,
    active: true,
    email: process.env.APP_ADMIN_EMAIL || '',
    password: process.env.APP_ADMIN_PASSWORD || '',
    language: Languages.PORTUGUESE,
    provider: networks['local'],
    address: accounts['USER_3'].address,
    avatar: await userService.randomAvatar(),
    createdAt: new Date(),
  };

  return [user1, user2, user3, user4];
};
