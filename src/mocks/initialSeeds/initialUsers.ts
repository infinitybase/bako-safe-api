import { User } from '@src/models';
import { UserService } from '@src/modules/user/service';

import { accounts } from '../accounts';
import { networks } from '../networks';
import { IconUtils } from '@utils/icons';

export const generateInitialUsers = async (): Promise<Partial<User>[]> => {
  const user1: Partial<User> = {
    name: `[${accounts['STORE'].privateKey}`,
    active: true,
    email: process.env.APP_ADMIN_EMAIL || '',
    provider: networks['local'],
    address: accounts['STORE'].address,
    avatar: IconUtils.user(),
    createdAt: new Date(),
  };

  const user2: Partial<User> = {
    name: `[ ${accounts['USER_1'].privateKey}`,
    active: true,
    email: process.env.APP_ADMIN_EMAIL || '',
    provider: networks['local'],
    address: accounts['USER_1'].address,
    avatar: IconUtils.user(),
    createdAt: new Date(),
  };

  const user3: Partial<User> = {
    name: `[${accounts['USER_2'].privateKey}`,
    active: true,
    email: process.env.APP_ADMIN_EMAIL || '',
    provider: networks['local'],
    address: accounts['USER_2'].address,
    avatar: IconUtils.user(),
    createdAt: new Date(),
  };

  const user4: Partial<User> = {
    name: `[${accounts['USER_3'].privateKey}`,
    active: true,
    email: process.env.APP_ADMIN_EMAIL || '',
    provider: networks['local'],
    address: accounts['USER_3'].address,
    avatar: IconUtils.user(),
    createdAt: new Date(),
  };

  return [user1, user2, user3, user4];
};
