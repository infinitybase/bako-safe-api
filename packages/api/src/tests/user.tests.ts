import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { TestEnvironment } from './utils/Setup';
import { generateNode } from './mocks/Networks';

test('User Endpoints', async t => {
  const { app, users, close } = await TestEnvironment.init(2, 0);

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
    'GET /user/latest/transactions should list home user transactions',
    async () => {
      const res = await request(app)
        .get('/user/latest/transactions')
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
});
