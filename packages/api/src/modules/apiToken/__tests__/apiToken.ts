import { AuthValidations } from '@utils/testUtils/Auth';
import { networks } from '@mocks/networks';
import { accounts } from 'bakosafe';
import { DEFAULT_TRANSACTION_TITLE, Predicate } from '@src/models';
import { PredicateMock } from '@mocks/predicate';
import { generateWorkspacePayload } from '@utils/testUtils/Workspace';

const tokenMock = {
  name: 'Test API Token',
  config: {
    transactionTitle: 'BakoSafe contract deployment',
  },
};

describe('[API TOKEN]', () => {
  let api: AuthValidations;
  let predicate: Predicate;

  beforeAll(async () => {
    api = new AuthValidations(networks['local'], accounts['USER_1']);

    await api.create();
    await api.createSession();

    const { data_user1, data_user2 } = await generateWorkspacePayload(api);
    const members = [data_user1.address, data_user2.address];
    const { predicatePayload } = await PredicateMock.create(1, members);
    const { data } = await api.axios.post('/predicate', predicatePayload);

    predicate = data;
  });

  test(
    'Create a api token for vault',
    async () => {
      const { data: apiTokenWithTitle } = await api.axios.post(
        `/api-token/${predicate.id}`,
        tokenMock,
      );

      expect(apiTokenWithTitle.token).toBeDefined();
      expect(apiTokenWithTitle.name).toBe(tokenMock.name);
      expect(apiTokenWithTitle.config.transactionTitle).toBe(
        tokenMock.config.transactionTitle,
      );

      const { data: apiTokenWithoutTitle } = await api.axios.post(
        `/api-token/${predicate.id}`,
        {
          ...tokenMock,
          config: undefined,
        },
      );

      expect(apiTokenWithoutTitle.token).toBeDefined();
      expect(apiTokenWithoutTitle.name).toBe(tokenMock.name);
      expect(apiTokenWithoutTitle.config.transactionTitle).toBe(
        DEFAULT_TRANSACTION_TITLE,
      );
    },
    10 * 1000,
  );
});
