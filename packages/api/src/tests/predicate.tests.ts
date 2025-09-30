import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';

import { Vault } from 'bakosafe';
import { generateNode } from './mocks/Networks';
import { saveMockPredicate } from './mocks/Predicate';
import { TestEnvironment } from './utils/Setup';

test('Predicate Endpoints', async t => {
  const { node } = await generateNode();

  const { app, users, close, predicates } = await TestEnvironment.init(9, 1, node);

  t.after(async () => {
    await close();
  });

  await t.test(
    'POST /predicate should create a predicate with version',
    async () => {
      const vault = predicates[0];
      const configurable = JSON.stringify(vault.configurable);
      const predicateAddress = vault.address.toB256();

      const payload = {
        name: `VaultPredicate ${Date.now()}`,
        description: 'Test predicate created from vault instance',
        configurable,
        predicateAddress,
        version: predicates[0].version,
      };

      const res = await request(app)
        .post('/predicate')

        .set('Authorization', users[0].token)
        .set('Signeraddress', users[0].payload.address)
        .send(payload);

      assert.equal(res.status, 201);
      assert.ok(res.body.id);
      assert.deepEqual(res.body.configurable, configurable);
      assert.equal(res.body.description, payload.description);
      assert.equal(res.body.predicateAddress, predicateAddress);
      assert.equal(res.body.owner.address, users[0].payload.address);
      // assert.equal(
      //   res.body.members.length,
      //   vault.configurable.SIGNERS.filter(i => i != ZeroBytes32).length,
      // );
    },
  );

  await t.test(
    'POST /predicate should create a predicate without version',
    async () => {
      const vault = predicates[0];
      const configurable = JSON.stringify(vault.configurable);
      const predicateAddress = vault.address.toB256();

      const payload = {
        name: `VaultPredicate without version ${Date.now()}`,
        description: 'Test predicate created from vault instance',
        configurable,
        predicateAddress,
      };

      const res = await request(app)
        .post(`/predicate`)
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address)
        .send(payload);

      assert.equal(res.status, 201);
      assert.ok('id' in res.body);
      assert.strictEqual(res.body.predicateAddress, predicateAddress);
      assert.strictEqual(res.body.name, payload.name);
      assert.strictEqual(res.body.description, payload.description);
      assert.deepEqual(res.body.configurable, configurable);
      assert.ok('address' in res.body.owner);
      assert.strictEqual(res.body.owner.address, users[0].payload.address);
      // assert.equal(
      //   res.body.members.length,
      //   vault.configurable?.SIGNERS.filter(i => i != ZeroBytes32).length,
      // );
      assert.ok('avatar' in res.body.members[0]);
      assert.ok('address' in res.body.members[0]);
      assert.ok('type' in res.body.members[0]);
    },
  );

  await t.test('GET /predicate should list predicates', async () => {
    type predicateMember = {
      id: string;
      address: string;
      avatar: string;
    };

    //on single workspace -> find by this user has signer
    // if member or signer or included on workspace of vault
    const validateListSingle = (members: predicateMember[]) => {
      return members.find(m => {
        return m.id == users[0].id && m.address == users[0].payload.address;
      });
    };

    const res = await request(app)
      .get('/predicate')
      .set('Authorization', users[0].token)
      .set('signeraddress', users[0].payload.address);

    assert.equal(res.status, 200);
    assert.ok('data' in res.body);

    res.body.data.forEach(element => {
      assert.ok('id' in element);
      assert.ok('members' in element);
      assert.ok('owner' in element);

      const idValid =
        !!validateListSingle([...element.members, element.owner]) ||
        !!element.workspace.permissions[users[0].id];

      assert.equal(idValid, true);
    });

    const page = 1;
    const perPage = 8;
    const resPage = await request(app)
      .get(`/predicate?page=${page}&perPage=${perPage}`)
      .set('Authorization', users[0].token)
      .set('signeraddress', users[0].payload.address);

    assert.equal(resPage.status, 200);
    assert.ok('data' in resPage.body);
    assert.ok(resPage.body.data.length <= perPage);
    assert.ok('total' in resPage.body);

    assert.strictEqual(resPage.body.currentPage, page);
    assert.strictEqual(resPage.body.perPage, perPage);
  });

  await t.test('GET /predicate/:id should find predicate by id', async () => {
    const vault = predicates[0];

    const { predicate, payload } = await saveMockPredicate(vault, users[0], app);

    const res = await request(app)
      .get(`/predicate/${predicate.id}`)
      .set('Authorization', users[0].token)
      .set('signeraddress', users[0].payload.address);

    assert.equal(res.status, 200);
    assert.strictEqual(res.body.predicateAddress, payload.predicateAddress);
    assert.strictEqual(res.body.name, payload.name);
    assert.strictEqual(res.body.description, payload.description);
    assert.deepEqual(res.body.configurable, payload.configurable);
    assert.ok('members' in res.body);
    assert.ok('id' in res.body);

    const { members, id } = res.body;
    assert.strictEqual(members.length, 3);
    assert.ok('address' in members[0]);
    assert.strictEqual(id, predicate.id);

    members.forEach(element => {
      const aux = members.find(m => element.id === m.id);
      assert.equal(!!aux, true);
    });
  });

  await t.test(
    'GET /predicate/by-name/:name should find predicate by name',
    async () => {
      const vault = predicates[0];

      const { predicate } = await saveMockPredicate(vault, users[0], app);

      const res = await request(app)
        .get(`/predicate/by-name/${predicate.name}`)
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address);

      assert.equal(res.status, 200);
      assert.equal(res.body, true);

      //find a unused name
      const resUnused = await request(app)
        .get(`/predicate/by-name/${crypto.randomUUID()}`)
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address);

      assert.equal(resUnused.status, 200);
      assert.equal(resUnused.body, false);
    },
  );

  await t.test(
    'GET /predicate/by-address/:address should find predicate by address',
    async () => {
      const vault = predicates[0];

      const { predicate, payload } = await saveMockPredicate(vault, users[0], app);

      const res = await request(app)
        .get(`/predicate/by-address/${predicate.predicateAddress}`)
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address);

      assert.equal(res.status, 200);
      assert.ok('id' in res.body);
      assert.ok('owner' in res.body);
      assert.ok('members' in res.body);
      assert.strictEqual(res.body.predicateAddress, payload.predicateAddress);
      assert.strictEqual(predicate.name, payload.name);
      assert.strictEqual(res.body.description, payload.description);
      assert.deepEqual(res.body.configurable, payload.configurable);
      assert.strictEqual(res.body.members.length, 3);
    },
  );

  await t.test(
    'GET /predicate/reserved-coins/:id should find predicate balance',
    async () => {
      const vault = predicates[0];

      const { predicate } = await saveMockPredicate(vault, users[0], app);

      const res = await request(app)
        .get(`/predicate/reserved-coins/${predicate.id}`)
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address);

      assert.equal(res.status, 200);
      assert.ok('reservedCoinsUSD' in res.body);
      assert.ok('totalBalanceUSD' in res.body);
      assert.ok('currentBalanceUSD' in res.body);
      assert.ok('currentBalance' in res.body);
      assert.ok('totalBalance' in res.body);
      assert.ok('reservedCoins' in res.body);
    },
  );

  await t.test(
    'GET /predicate/reserved-coins/:id should return unknown error',
    async () => {
      const vault = predicates[0];
      const { predicate } = await saveMockPredicate(vault, users[0], app);

      const mock = t.mock.method(Vault.prototype, 'getBalances', () => {
        throw new Error('Test error');
      });

      const res = await request(app)
        .get(`/predicate/reserved-coins/${predicate.id}`)
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address);

      assert.ok(mock.mock.calls.length > 0);
      assert.equal(res.status, 500);
      assert.equal(res.body.origin, 'unknown');
      assert.ok(Array.isArray(res.body.errors));
      t.mock.reset();
    },
  );

  await t.test(
    'GET /check/by-address/:address should check if predicate exists by addr',
    async () => {
      const vault = predicates[0];

      const { predicate } = await saveMockPredicate(vault, users[0], app);

      const res = await request(app)
        .get(`/predicate/check/by-address/${predicate.predicateAddress}`)
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address);

      assert.equal(res.status, 200);
      assert.equal(res.body, true);
    },
  );

  await t.test(
    'PUT /predicate/:address/visibility should toggle predicate visibility',
    async () => {
      const vault = predicates[0];

      const { predicate } = await saveMockPredicate(vault, users[0], app);

      const res = await request(app)
        .put(`/predicate/${predicate.predicateAddress}/visibility`)
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address);

      assert.equal(res.status, 200);
      assert.ok(res.body.includes(predicate.predicateAddress));
    },
  );
});
