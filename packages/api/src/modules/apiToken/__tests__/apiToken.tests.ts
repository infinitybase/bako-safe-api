import { AuthValidations, catchApplicationError } from '@utils/testUtils/Auth';
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

    const {
      data_user1,
      data_user2,
      data: workspace,
    } = await generateWorkspacePayload(api);
    await api.selectWorkspace(workspace.id);
    const members = [data_user1.address, data_user2.address];
    const { predicatePayload } = await PredicateMock.create(1, members);
    const { data } = await api.axios.post('/predicate', predicatePayload);

    predicate = data;
  });

  describe('Create', () => {
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

        expect(apiTokenWithoutTitle.id).toBeDefined();
        expect(apiTokenWithoutTitle.token).toBeDefined();
        expect(apiTokenWithoutTitle.name).toBe(tokenMock.name);
        expect(apiTokenWithoutTitle.config.transactionTitle).toBe(
          DEFAULT_TRANSACTION_TITLE,
        );
      },
      10 * 1000,
    );

    test('Body and params on create api token', async () => {
      // Error on missing required fields
      const payloadError = await catchApplicationError(
        api.axios.post(`/api-token/${predicate.id}`, {}),
      );
      expect(payloadError.origin).toBe('body');
      expect(payloadError.errors).toEqual([
        {
          type: 'any.required',
          title: '"name" is required',
          detail: '"name" is required',
        },
      ]);

      // Error on invalid predicate id
      const predicateError = await catchApplicationError(
        api.axios.post(`/api-token/invalid-id`, tokenMock),
      );
      expect(predicateError.origin).toBe('params');
      expect(predicateError.errors).toEqual([
        {
          type: 'string.guid',
          title: '"predicateId" must be a valid GUID',
          detail: '"predicateId" must be a valid GUID',
        },
      ]);
    });

    test('Permissions on create api token', async () => {
      // Error on not found predicate
      const notFoundError = await catchApplicationError(
        api.axios.post(
          `/api-token/9328ed43-31c7-428a-bb73-c03534bf34f0`,
          tokenMock,
        ),
      );

      expect(notFoundError.origin).toBe('app');
      expect(notFoundError.errors).toEqual({
        detail: 'Predicate with id 9328ed43-31c7-428a-bb73-c03534bf34f0 not found',
        title: 'Predicate not found',
        type: 'NotFound',
      });

      // Error on not allowed predicate
      const notWorkspaceMember = new AuthValidations(
        networks['local'],
        accounts['USER_2'],
      );
      await notWorkspaceMember.create();
      await notWorkspaceMember.createSession();

      const notWorkspaceMemberError = await catchApplicationError(
        notWorkspaceMember.axios.post(`/api-token/${predicate.id}`, tokenMock),
      );
      expect(notWorkspaceMemberError.origin).toBe('app');
      expect(notWorkspaceMemberError.errors).toEqual({
        type: 'Unauthorized',
        title: 'Missing permission',
        detail: 'You do not have permission to access this resource',
      });

      // Error on not allowed predicate
      const notFoundPermission = new AuthValidations(
        networks['local'],
        accounts['USER_3'],
      );
      await notFoundPermission.create();
      await notFoundPermission.createSession();
      await notFoundPermission.selectWorkspace(predicate.workspace.id);

      const notFoundPermissionError = await catchApplicationError(
        notFoundPermission.axios.post(`/api-token/${predicate.id}`, tokenMock),
      );
      expect(notFoundPermissionError.origin).toBe('app');
      expect(notFoundPermissionError.errors).toEqual({
        type: 'Unauthorized',
        title: 'Missing permission',
        detail: 'You do not have permission to access this resource',
      });
    });
  });

  describe('Delete', () => {
    test('Delete a api token', async () => {
      const { data: apiToken } = await api.axios.post(
        `/api-token/${predicate.id}`,
        tokenMock,
      );

      const { data, status } = await api.axios.delete(
        `/api-token/${predicate.id}/${apiToken.id}`,
      );
      expect(data).toBeNull();
      expect(status).toBe(201);
    });

    test('Not a member of workspace', async () => {
      const { data: apiToken } = await api.axios.post(
        `/api-token/${predicate.id}`,
        tokenMock,
      );

      const notWorkspaceMember = new AuthValidations(
        networks['local'],
        accounts['USER_2'],
      );
      await notWorkspaceMember.create();
      await notWorkspaceMember.createSession();

      const notWorkspaceMemberError = await catchApplicationError(
        notWorkspaceMember.axios.delete(
          `/api-token/${predicate.id}/${apiToken.id}`,
        ),
      );

      expect(notWorkspaceMemberError.origin).toBe('app');
      expect(notWorkspaceMemberError.errors).toEqual({
        type: 'Unauthorized',
        title: 'Missing permission',
        detail: 'You do not have permission to access this resource',
      });
    });

    test('Not found permission in workspace', async () => {
      const { data: apiToken } = await api.axios.post(
        `/api-token/${predicate.id}`,
        tokenMock,
      );

      // Error on not allowed predicate
      const notFoundPermission = new AuthValidations(
        networks['local'],
        accounts['USER_3'],
      );
      await notFoundPermission.create();
      await notFoundPermission.createSession();
      await notFoundPermission.selectWorkspace(predicate.workspace.id);

      const notFoundPermissionError = await catchApplicationError(
        notFoundPermission.axios.delete(
          `/api-token/${predicate.id}/${apiToken.id}`,
        ),
      );
      expect(notFoundPermissionError.origin).toBe('app');
      expect(notFoundPermissionError.errors).toEqual({
        type: 'Unauthorized',
        title: 'Missing permission',
        detail: 'You do not have permission to access this resource',
      });
    });
  });

  describe('List', () => {
    test('List api tokens', async () => {
      await api.axios.post(`/api-token/${predicate.id}`, tokenMock);

      const { data } = await api.axios.get(`/api-token/${predicate.id}`);
      const [token] = data;

      expect(token.id).toBeDefined();
      expect(token.token).not.toBeDefined();
    });
  });
});
