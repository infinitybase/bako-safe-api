import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { TestEnvironment } from './utils/Setup';
import { generateNode } from './mocks/Networks';

test('Address Book Endpoints', async t => {
  const { provider, node } = await generateNode();

  const { app, users, close } = await TestEnvironment.init(2, 0, node, provider);

  t.after(async () => {
    await close();
  });

  let createdId: string;

  await t.test('POST /address-book should create a new entry', async () => {
    const adb = {
      nickname: `Underground Seninha ${Date.now()}`,
      address: users[1].payload.address,
    };

    const res = await request(app)
      .post('/address-book')
      .set('Authorization', users[0].token)
      .set('signeraddress', users[0].payload.address)
      .send(adb);

    assert.equal(res.status, 201);
    assert.ok(res.body.id);
    assert.equal(res.body.nickname, adb.nickname);
    assert.equal(res.body.user.address, adb.address);

    createdId = res.body.id;
  });

  await t.test(
    'PUT /address-book/:id should update the entry nickname',
    async () => {
      const newNickname = `Updated Seninha ${Date.now()}`;

      const res = await request(app)
        .put(`/address-book/${createdId}`)
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address)
        .send({
          nickname: newNickname,
          id: createdId,
          address: users[1].payload.address,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.nickname, newNickname);
    },
  );

  await t.test('GET /address-book should list entries', async () => {
    const res = await request(app)
      .get('/address-book')
      .set('Authorization', users[0].token)
      .set('signeraddress', users[0].payload.address);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data) || Array.isArray(res.body));
    assert.ok(res.body.data?.length || res.body.length);
  });

  await t.test('DELETE /address-book/:id should delete the entry', async () => {
    const res = await request(app)
      .delete(`/address-book/${createdId}`)
      .set('Authorization', users[0].token)
      .set('signeraddress', users[0].payload.address);

    assert.equal(res.status, 200);
    assert.equal(res.body, true);
  });
});
