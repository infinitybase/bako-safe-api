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

  test('List predicate versions', async () => {
    //with pagination
    const page = 0;
    const perPage = 10;
    await api
      .get(`/predicate-version?page=${page}&perPage=${perPage}`)
      .then(({ data, status }) => {
        expect(status).toBe(200);
        expect(data).toHaveProperty('data');
        expect(data).toHaveProperty('total');
        expect(data).toHaveProperty('currentPage', page);
        expect(data).toHaveProperty('perPage', perPage);
        expect(data.data.length).toBeLessThanOrEqual(perPage);
        data.data.forEach(element => {
          expect(element).toHaveProperty('id');
          expect(element).toHaveProperty('name');
          expect(element).toHaveProperty('description');
          expect(element).toHaveProperty('rootAddress');
          expect(element).toHaveProperty('abi');
          expect(element).toHaveProperty('bytes');
          expect(element).toHaveProperty('active');
        });
      });

    //without pagination
    await api.get('/predicate-version').then(({ data, status }) => {
      expect(status).toBe(200);
      data.forEach(element => {
        expect(element).toHaveProperty('id');
        expect(element).toHaveProperty('name');
        expect(element).toHaveProperty('description');
        expect(element).toHaveProperty('rootAddress');
        expect(element).toHaveProperty('abi');
        expect(element).toHaveProperty('bytes');
        expect(element).toHaveProperty('active');
      });
    });
  });
});
