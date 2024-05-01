import { predicateVersions } from '@src/mocks/predicateVersion';
import axios from 'axios';

describe('[PREDICATE VERSION]', () => {
  let api = beforeAll(() => {
    api = axios.create({
      baseURL: 'http://localhost:3333',
    });
  });

  test('Create predicate version', async () => {
    await api
      .post('/predicate-version', predicateVersions[1])
      .then(({ data, status }) => {
        expect(status).toBe(200);
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('name', predicateVersions[1].name);
        expect(data).toHaveProperty('description', null);
        expect(data).toHaveProperty(
          'rootAddress',
          predicateVersions[1].rootAddress,
        );
        expect(data).toHaveProperty('abi', predicateVersions[1].abi);
        expect(data).toHaveProperty('bytes', predicateVersions[1].bytes);
        expect(data).toHaveProperty('active', true);
      });

    //duplicated root address
    const { data, status } = await api
      .post('/predicate-version', predicateVersions[1])
      .catch(e => {
        return e.response;
      });

    expect(status).toBe(400);
    expect(data).toHaveProperty('type');
    expect(data).toHaveProperty('title');
    expect(data).toHaveProperty('detail');
  });

  test('Find current predicate version', async () => {
    await api.get('/predicate-version/current').then(({ data, status }) => {
      expect(status).toBe(200);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('description');
      expect(data).toHaveProperty('rootAddress');
      expect(data).toHaveProperty('abi');
      expect(data).toHaveProperty('bytes');
      expect(data).toHaveProperty('active');
    });
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

  test('Find predicate version by root address', async () => {
    await api
      .get(`/predicate-version/${predicateVersions[1].rootAddress}`)
      .then(({ data, status }) => {
        expect(status).toBe(200);
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('name', predicateVersions[1].name);
        expect(data).toHaveProperty('description', null);
        expect(data).toHaveProperty(
          'rootAddress',
          predicateVersions[1].rootAddress,
        );
        expect(data).toHaveProperty('abi', predicateVersions[1].abi);
        expect(data).toHaveProperty('bytes', predicateVersions[1].bytes);
        expect(data).toHaveProperty('active', true);
      });
  });
});
