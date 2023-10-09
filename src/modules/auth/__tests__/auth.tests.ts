import supertest from 'supertest';

import App from '@src/server/app';
import Bootstrap from '@src/server/bootstrap';

const app = new App();
const request = supertest(app.serverApp);

describe('[PREDICATE]', () => {
  beforeAll(async () => {
    await Bootstrap.start();
  });
});
