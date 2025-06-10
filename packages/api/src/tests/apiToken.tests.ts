import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { TestEnvironment } from './utils/Setup';
import { apiTokenMock } from './mocks/Tokens';
import { saveMockPredicate } from './mocks/Predicate';
import { generateNode } from './mocks/Networks';

test('Api token Endpoints', async t => {
  const { provider, node } = await generateNode();

  const { app, users, close, predicates } = await TestEnvironment.init(2, 1, node);

  const vault = predicates[0];

  const { predicate } = await saveMockPredicate(vault, users[0], app);

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
        .send(apiTokenMock);

      assert.ok('token' in apiTokenComplete);
      assert.strictEqual(apiTokenComplete.name, apiTokenMock.name);
      assert.strictEqual(
        apiTokenComplete.config.transactionTitle,
        apiTokenMock.config.transactionTitle,
      );

      const { body: apiTokenWithoutTitle } = await request(app)
        .post(`/api-token/${predicate.id}`)
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address)
        .send({ ...apiTokenMock, config: undefined });

      assert.ok('id' in apiTokenWithoutTitle);
      assert.ok('token' in apiTokenWithoutTitle);
      assert.strictEqual(apiTokenWithoutTitle.name, apiTokenMock.name);
      assert.strictEqual(apiTokenWithoutTitle.config.transactionTitle, '');
    },
  );

  await t.test('GET /api-token/:predicateId should list api tokens', async () => {
    await request(app)
      .post(`/api-token/${predicate.id}`)
      .set('Authorization', users[0].token)
      .set('signeraddress', users[0].payload.address)
      .send(apiTokenMock);

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
        .send(apiTokenMock);

      const { body: data, status } = await request(app)
        .delete(`/api-token/${predicate.id}/${apiToken.id}`)
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address);

      assert.strictEqual(data, null);
      assert.strictEqual(status, 201);
    },
  );
});
