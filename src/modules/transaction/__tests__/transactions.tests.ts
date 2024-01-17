import { Address } from 'fuels';

import { accounts } from '@src/mocks/accounts';
import { networks } from '@src/mocks/networks';
import { PredicateMock } from '@src/mocks/predicate';
import { transaction, transactionMock } from '@src/mocks/transaction';
import { AuthValidations } from '@src/utils/testUtils/Auth';

describe('[TRANSACTION]', () => {
  let api: AuthValidations;
  beforeAll(async () => {
    api = new AuthValidations(networks['local'], accounts['USER_1']);

    await api.create();
    await api.createSession();
  });

  test(
    'Create transaction',
    async () => {
      const user_aux = Address.fromRandom().toString();
      const members = [accounts['USER_1'].address, user_aux];
      const { predicatePayload, vault } = await PredicateMock.create(1, members);
      await api.axios.post('/predicate', predicatePayload);

      const { tx, payload_transfer } = await transactionMock(vault);
      const { data: data_transaction } = await api.axios.post(
        '/transaction',
        payload_transfer,
      );

      expect(data_transaction).toHaveProperty('id');
      expect(data_transaction).toHaveProperty(
        'predicate.predicateAddress',
        vault.address.toString(),
      );
      expect(data_transaction).toHaveProperty('witnesses');
      expect(data_transaction.witnesses).toHaveLength(members.length);
      expect(data_transaction).toHaveProperty('assets');
      expect(tx.getHashTxId()).toEqual(data_transaction.hash);
    },
    60 * 1000,
  );
});
