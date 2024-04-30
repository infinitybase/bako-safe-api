import { predicateVersion } from '@src/mocks/predicateVersion';
import axios from 'axios';

describe('[PREDICATE VERSION]', () => {
  let api = beforeAll(() => {
    api = axios.create({
      baseURL: 'http://localhost:3333',
    });
  });

  test('Find current predicate version', async () => {
    const { data } = await api.get('/predicate-version/current');

    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('name', predicateVersion.name);
    expect(data).toHaveProperty('description', null);
    expect(data).toHaveProperty('rootAddress', predicateVersion.rootAddress);
    expect(data).toHaveProperty('abi', predicateVersion.abi);
    expect(data).toHaveProperty('bytes', predicateVersion.bytes);
    expect(data).toHaveProperty('active', true);
  });
});
