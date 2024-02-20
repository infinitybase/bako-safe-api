import { generateInitialAddressBook } from '@src/mocks/initialSeeds/initialAddressBook';
import AddressBook from '@src/models/AddressBook';

export default async function () {
  for await (const addressBook of await generateInitialAddressBook()) {
    await AddressBook.create(addressBook).save();
  }
}
