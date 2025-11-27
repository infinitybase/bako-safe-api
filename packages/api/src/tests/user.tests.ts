import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

import { generateNode } from './mocks/Networks';
import { saveMockPredicate } from './mocks/Predicate';
import { TestEnvironment } from './utils/Setup';

test('User Endpoints', async t => {
  const { node } = await generateNode();
  const { app, users, close, predicates, network } = await TestEnvironment.init(2, 1, node);

  t.after(async () => {
    await close();
  });

  await t.test(
    'POST /user/select-network should return network object with url and chainId',
    async () => {
      const res = await request(app)
        .post('/user/select-network')
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address)
        .send({ network: network.url });

      assert.equal(res.status, 200);
      assert.ok('url' in res.body, 'Response should contain url');
      assert.ok('chainId' in res.body, 'Response should contain chainId');
      assert.equal(typeof res.body.url, 'string');
      assert.equal(typeof res.body.chainId, 'number');
    },
  );

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

  await t.test(
    'GET /user/transactions should accept status query param',
    async () => {
      const res = await request(app)
        .get('/user/transactions')
        .query({ status: ['await_requirements', 'pending_sender'] })
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address);

      assert.equal(res.status, 200);
      assert.ok('data' in res.body);
      assert.ok(Array.isArray(res.body.data));
    },
  );

  await t.test(
    'GET /user/transactions should accept type query param',
    async () => {
      const res = await request(app)
        .get('/user/transactions')
        .query({ type: 'DEPOSIT' })
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address);

      assert.equal(res.status, 200);
      assert.ok('data' in res.body);
      assert.ok(Array.isArray(res.body.data));
    },
  );

  await t.test(
    'GET /user/transactions should accept both status and type query params',
    async () => {
      const res = await request(app)
        .get('/user/transactions')
        .query({ status: ['success'], type: 'TRANSACTION_SCRIPT' })
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
      assert.ok(Array.isArray(res.body.predicates));
    },
  );

  await t.test(
    'GET /user/allocation should return predicates with correct structure',
    async () => {
      const res = await request(app)
        .get('/user/allocation')
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address);

      assert.equal(res.status, 200);

      // Validate response structure
      assert.ok('data' in res.body, 'Response should have data array');
      assert.ok('totalAmountInUSD' in res.body, 'Response should have totalAmountInUSD');
      assert.ok('predicates' in res.body, 'Response should have predicates array');

      assert.ok(Array.isArray(res.body.data), 'data should be an array');
      assert.ok(Array.isArray(res.body.predicates), 'predicates should be an array');
      assert.equal(typeof res.body.totalAmountInUSD, 'number', 'totalAmountInUSD should be a number');

      // Validate predicate structure if any exist
      if (res.body.predicates.length > 0) {
        const predicate = res.body.predicates[0];
        assert.ok('id' in predicate, 'Predicate should have id');
        assert.ok('name' in predicate, 'Predicate should have name');
        assert.ok('address' in predicate, 'Predicate should have address');
        assert.ok('members' in predicate, 'Predicate should have members count');
        assert.ok('minSigners' in predicate, 'Predicate should have minSigners count');
        assert.ok('amountInUSD' in predicate, 'Predicate should have amountInUSD');

        assert.equal(typeof predicate.id, 'string', 'id should be string');
        assert.equal(typeof predicate.name, 'string', 'name should be string');
        assert.equal(typeof predicate.address, 'string', 'address should be string');
        assert.equal(typeof predicate.members, 'number', 'members should be number');
        assert.equal(typeof predicate.minSigners, 'number', 'minSigners should be number');
        assert.equal(typeof predicate.amountInUSD, 'number', 'amountInUSD should be number');
      }

      // Validate asset allocation structure if any exist
      if (res.body.data.length > 0) {
        const allocation = res.body.data[0];
        assert.ok('assetId' in allocation, 'Allocation should have assetId');
        assert.ok('amountInUSD' in allocation, 'Allocation should have amountInUSD');
        assert.ok('percentage' in allocation, 'Allocation should have percentage');

        assert.equal(typeof allocation.amountInUSD, 'number', 'amountInUSD should be number');
        assert.equal(typeof allocation.percentage, 'number', 'percentage should be number');
      }
    },
  );

  await t.test(
    'GET /user/allocation should accept limit query param',
    async () => {
      const res = await request(app)
        .get('/user/allocation')
        .query({ limit: 3 })
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.predicates));
      assert.ok(res.body.predicates.length <= 3, 'Should return at most 3 predicates');
    },
  );
});
