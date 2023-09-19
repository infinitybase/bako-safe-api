import { predicate } from '@mocks/predicate';
import supertest from 'supertest';

import App from '@src/server/app';
import Bootstrap from '@src/server/bootstrap';

const app = new App();
const request = supertest(app.serverApp);

describe('[PREDICATE]', () => {
  beforeAll(async () => {
    await Bootstrap.start();
  });

  test('[CREATE] /predicate/', async () => {
    const result = await request.post('/predicate/').send(predicate).expect(200);
    expect(result.body).toMatchObject({
      ...predicate,
    });
  });

  test('[FIND] /predicate/', async () => {
    await request.get('/predicate/').expect(200);
  });
});
