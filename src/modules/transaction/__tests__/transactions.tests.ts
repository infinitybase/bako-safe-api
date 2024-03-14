import { TransactionStatus } from 'bsafe';
import { Address } from 'fuels';

import { accounts } from '@src/mocks/accounts';
import { networks } from '@src/mocks/networks';
import { PredicateMock } from '@src/mocks/predicate';
import { transactionMock } from '@src/mocks/transaction';
import { AuthValidations } from '@src/utils/testUtils/Auth';
import { generateWorkspacePayload } from '@src/utils/testUtils/Workspace';

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

  test(
    'Create transaction with invalid permission',
    async () => {
      // logar com usuário inválido no workspace
      const auth = new AuthValidations(networks['local'], accounts['USER_3']);

      await auth.create();
      await auth.createSession();

      const {
        data_user1,
        data_user2,
        USER_5,
        data: workspace,
      } = await generateWorkspacePayload(auth);
      await auth.selectWorkspace(workspace.id);

      //gerar um predicate
      const members = [data_user1.address, data_user2.address];

      const { predicatePayload, vault } = await PredicateMock.create(1, members);
      await auth.axios.post('/predicate', predicatePayload);

      const aux_auth = new AuthValidations(networks['local'], accounts['USER_5']);
      await aux_auth.create();
      await aux_auth.createSession();
      await aux_auth.selectWorkspace(workspace.id);

      //gerar uma transacao com um usuário inválido
      const { payload_transfer } = await transactionMock(vault);
      const {
        status: status_transaction,
        data: data_transaction,
      } = await aux_auth.axios.post('/transaction', payload_transfer).catch(e => {
        return e.response;
      });

      //validacoes
      expect(status_transaction).toBe(401);
      expect(data_transaction).toHaveProperty(
        'detail',
        'You do not have permission to access this resource',
      );
    },
    60 * 1000,
  );

  test(
    'Create transaction with vault member',
    async () => {
      // logar com usuário inválido no workspace
      const auth = new AuthValidations(networks['local'], accounts['USER_5']);
      await auth.create();
      await auth.createSession();
      const {
        data,
        data_user1,
        data_user2,
        USER_5,
      } = await generateWorkspacePayload(auth);

      //gerar um predicate
      const members = [data_user1.address, data_user2.address, USER_5.address];

      const { predicatePayload, vault } = await PredicateMock.create(1, members);
      await api.axios.post('/predicate', predicatePayload);

      //gerar uma transacao com um usuário inválido
      const { payload_transfer } = await transactionMock(vault);
      const { status: status_transaction } = await auth.axios.post(
        '/transaction',
        payload_transfer,
      );

      //validacoes
      expect(status_transaction).toBe(200);
    },
    60 * 1000,
  );

  test('List transactions', async () => {
    const auth = new AuthValidations(networks['local'], accounts['USER_5']);
    await auth.create();
    await auth.createSession();

    //on single workspace
    await auth.axios.get('/transaction').then(({ data, status }) => {
      expect(status).toBe(200);
      let prev = undefined;

      data.forEach((element, index) => {
        const aux = element.predicate;
        if (prev && index > 0) {
          expect(new Date(prev).getTime()).toBeGreaterThan(
            new Date(element.updatedAt).getTime(),
          );
        }
        prev = element.updatedAt;

        expect(aux).toHaveProperty('id');
        expect(aux).toHaveProperty('predicateAddress');
        expect(aux.workspace).toHaveProperty('id', auth.workspace.id);
        expect(aux.workspace).toHaveProperty('name', auth.workspace.name);
      });
    });

    //with pagination
    const page = 1;
    const perPage = 9;
    await auth.axios
      .get(`/transaction?page=${page}&perPage=${perPage}`)
      .then(({ data, status }) => {
        console.log('[TRANSACTION]: ', data);
        expect(status).toBe(200);
        expect(data).toHaveProperty('data');
        expect(data.data.length).toBeLessThanOrEqual(perPage);
        expect(data).toHaveProperty('total');
        expect(data).toHaveProperty('currentPage', page);
        expect(data).toHaveProperty('perPage', perPage);
      });

    const _status = [
      TransactionStatus.AWAIT_REQUIREMENTS,
      TransactionStatus.PENDING_SENDER,
    ];
    await auth.axios
      .get(`/transaction?status=${_status[0]}&status=${_status[1]}`)
      .then(({ data, status }) => {
        expect(status).toBe(200);
        data.forEach(element => {
          const aux = _status.includes(element.status);
          expect(aux).toBe(true);
        });
      });

    //an another workspace
    const { data: data_workspace } = await generateWorkspacePayload(auth);
    await auth.selectWorkspace(data_workspace.id);
    await auth.axios.get('/transaction').then(({ data, status }) => {
      expect(status).toBe(200);
      expect(data).toHaveLength(0);
    });
  });
});
