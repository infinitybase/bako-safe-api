import { vaultTemplate } from '@mocks/vaultTemplate';
import supertest from 'supertest';

import App from '@src/server/app';
import Bootstrap from '@src/server/bootstrap';

const app = new App();
const request = supertest(app.serverApp);

describe('[VAULT_TEMPLATE]', () => {
  beforeAll(async () => {
    await Bootstrap.start();
  });

  test('[CREATE] /vaultTemplate/', async () => {
    const result = await request
      .post('/vaultTemplate/')
      .send(vaultTemplate)
      .expect(200);
    expect(result.body).toMatchObject({
      ...vaultTemplate,
    });
  });

  test('[LIST] /vaultTemplate/', async () => {
    const result = await request.get('/vaultTemplate/').expect(200);
    expect(result.body).toMatchObject({
      ...vaultTemplate,
    });
  });
});
