import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

import { generateNode } from './mocks/Networks';
import { saveMockPredicate } from './mocks/Predicate';
import { TestEnvironment } from './utils/Setup';

test('User Endpoints', async t => {
  const { node } = await generateNode();
  const { app, users, close, predicates } = await TestEnvironment.init(2, 1, node);

  t.after(async () => {
    await close();
  });

  await t.test('PUT /user/:id should update the entry nickname', async () => {
    const newName = `${new Date().getTime()} - Update user test`;

    const res = await request(app)
      .put(`/user/${users[1].id}`)
      .set('Authorization', users[1].token)
      .set('signeraddress', users[1].payload.address)
      .send({
        name: newName,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.name, newName);
  });

  await t.test(
    'GET /user/predicates should list home user predicates',
    async () => {
      const res = await request(app)
        .get('/user/predicates')
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address);

      assert.equal(res.status, 200);
      assert.ok('predicates' in res.body);
    },
  );

  await t.test(
    'GET /user/transactions should list home user transactions',
    async () => {
      const res = await request(app)
        .get('/user/transactions')
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address);

      assert.equal(res.status, 200);
      assert.ok('data' in res.body);
      assert.ok(Array.isArray(res.body.data));
    },
  );

  await t.test('GET /user/latest/tokens should get token usd amounts', async () => {
    const res = await request(app)
      .get('/user/latest/tokens')
      .set('Authorization', users[0].token)
      .set('signeraddress', users[0].payload.address);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  await t.test(
    "GET /user/allocation should get user's asset allocation",
    async () => {
      const vault = predicates[0];
      await saveMockPredicate(vault, users[0], app);

      const res = await request(app)
        .get('/user/allocation')
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.ok('totalAmountInUSD' in res.body);
      assert.ok('predicates' in res.body);
      assert.strictEqual(typeof res.body.predicates, 'object');
    },
  );
});
