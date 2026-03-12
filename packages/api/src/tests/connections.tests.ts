import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { TestEnvironment } from './utils/Setup';
import { generateNode } from './mocks/Networks';
import { saveMockPredicate } from './mocks/Predicate';

test('Connections/dApps Endpoints', async t => {
  const { node } = await generateNode();

  const { app, users, predicates, close } = await TestEnvironment.init(2, 1, node);

  const vault = predicates[0];
  const { predicate } = await saveMockPredicate(vault, users[0], app);

  t.after(async () => {
    await close();
  });

  const testSessionId = `test-session-${Date.now()}`;

  await t.test(
    'GET /connections/:sessionId/state should return false for non-existent session',
    async () => {
      const res = await request(app)
        .get(`/connections/${testSessionId}/state`)
        .set('origin', 'http://localhost:5174');

      assert.equal(res.status, 200);
      assert.equal(res.body, false);
    },
  );

  await t.test(
    'GET /connections/:sessionId/currentAccount should return null for non-existent session',
    async () => {
      const res = await request(app)
        .get(`/connections/${testSessionId}/currentAccount`)
        .set('origin', 'http://localhost:5174');

      assert.equal(res.status, 200);
      assert.equal(res.body, null);
    },
  );

  await t.test(
    'GET /connections/:sessionId/currentNetwork should return null for non-existent session',
    async () => {
      const res = await request(app)
        .get(`/connections/${testSessionId}/currentNetwork`)
        .set('origin', 'http://localhost:5174');

      assert.equal(res.status, 200);
      assert.equal(res.body, null);
    },
  );

  await t.test(
    'POST /connections should create a new dApp connection',
    async () => {
      const connectionPayload = {
        vaultId: predicate.id,
        sessionId: testSessionId,
        name: 'Test dApp',
        origin: 'http://localhost:5174',
        userAddress: users[0].payload.address,
        request_id: `req-${Date.now()}`,
      };

      const res = await request(app)
        .post('/connections')
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address)
        .send(connectionPayload);

      assert.equal(res.status, 201);
      assert.equal(res.body, true);
    },
  );

  await t.test(
    'GET /connections/:sessionId/state should return true after connection',
    async () => {
      const res = await request(app)
        .get(`/connections/${testSessionId}/state`)
        .set('origin', 'http://localhost:5174');

      assert.equal(res.status, 200);
      assert.equal(res.body, true);
    },
  );

  await t.test(
    'GET /connections/:sessionId/currentAccount should return vault address after connection',
    async () => {
      const res = await request(app)
        .get(`/connections/${testSessionId}/currentAccount`)
        .set('origin', 'http://localhost:5174');

      assert.equal(res.status, 200);
      assert.equal(res.body, predicate.predicateAddress);
    },
  );

  await t.test(
    'GET /connections/:sessionId/accounts should return vault addresses',
    async () => {
      const res = await request(app)
        .get(`/connections/${testSessionId}/accounts`)
        .set('origin', 'http://localhost:5174');

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.ok(res.body.includes(predicate.predicateAddress));
    },
  );

  await t.test(
    'GET /connections/:sessionId should return current vault address',
    async () => {
      const res = await request(app)
        .get(`/connections/${testSessionId}`)
        .set('origin', 'http://localhost:5174');

      assert.equal(res.status, 200);
      assert.equal(res.body, predicate.predicateAddress);
    },
  );

  await t.test(
    'DELETE /connections/:sessionId should disconnect the dApp',
    async () => {
      const res = await request(app)
        .delete(`/connections/${testSessionId}`)
        .set('origin', 'http://localhost:5174');

      assert.equal(res.status, 204);
    },
  );

  await t.test(
    'GET /connections/:sessionId/state should return false after disconnect',
    async () => {
      const res = await request(app)
        .get(`/connections/${testSessionId}/state`)
        .set('origin', 'http://localhost:5174');

      assert.equal(res.status, 200);
      assert.equal(res.body, false);
    },
  );
});
