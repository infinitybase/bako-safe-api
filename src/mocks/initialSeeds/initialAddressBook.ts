import { User } from '@src/models';
import AddressBook, { AddressBookType } from '@src/models/AddressBook';

import { accounts } from '../accounts';

export const generateInitialAddressBook = async (): Promise<
  Partial<AddressBook>[]
> => {
  const owner = await User.findOne({
    where: { address: accounts['USER_1'].address },
  });

  const a1: Partial<AddressBook> = {
    nickname: 'Store',
    POwner: owner,
    type: AddressBookType.PERSONAL,
    user: await User.findOne({
      where: { address: accounts['STORE'].address },
    }),
  };

  const a2: Partial<AddressBook> = {
    nickname: 'User 2',
    POwner: owner,
    type: AddressBookType.PERSONAL,
    user: await User.findOne({
      where: { address: accounts['USER_2'].address },
    }),
  };

  return [a1, a2];
};
