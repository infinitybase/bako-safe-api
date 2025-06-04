import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { TestEnvironment } from './utils/Setup';
import { PredicateMock } from './mocks/Predicate';
import { tokenMock } from './mocks/ApiToken';

test('Api token Endpoints', async t => {
  const { app, users, close } = await TestEnvironment.init();

  const predicate = await PredicateMock.getPredicate(users, app);

  t.after(async () => {
    await close();
  });

  await t.test(
    'POST /api-token/:predicateId should create a api token for vault',
    async () => {
      const { body: apiTokenComplete } = await request(app)
        .post(`/api-token/${predicate.id}`)
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address)
        .send(tokenMock);

      assert.ok('token' in apiTokenComplete);
      assert.strictEqual(apiTokenComplete.name, tokenMock.name);
      assert.strictEqual(
        apiTokenComplete.config.transactionTitle,
        tokenMock.config.transactionTitle,
      );

      const { body: apiTokenWithoutTitle } = await request(app)
        .post(`/api-token/${predicate.id}`)
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address)
        .send({ ...tokenMock, config: undefined });

      assert.ok('id' in apiTokenWithoutTitle);
      assert.ok('token' in apiTokenWithoutTitle);
      assert.strictEqual(apiTokenWithoutTitle.name, tokenMock.name);
      assert.strictEqual(apiTokenWithoutTitle.config.transactionTitle, '');
    },
  );

  await t.test('GET /api-token/:predicateId should list api tokens', async () => {
    await request(app)
      .post(`/api-token/${predicate.id}`)
      .set('Authorization', users[0].token)
      .set('signeraddress', users[0].payload.address)
      .send(tokenMock);

    const { body: data } = await request(app)
      .get(`/api-token/${predicate.id}`)
      .set('Authorization', users[0].token)
      .set('signeraddress', users[0].payload.address);

    const [token] = data;

    assert.ok('id' in token);
    assert.strictEqual(token.token, undefined);
  });

  await t.test(
    'DELETE /api-token/:predicateId/:apiTokenId should delete api token',
    async () => {
      const { body: apiToken } = await request(app)
        .post(`/api-token/${predicate.id}`)
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address)
        .send(tokenMock);

      const { body: data, status } = await request(app)
        .delete(`/api-token/${predicate.id}/${apiToken.id}`)
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address);

      assert.strictEqual(data, null);
      assert.strictEqual(status, 201);
    },
  );
});
