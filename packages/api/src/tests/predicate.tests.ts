import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { TestEnvironment } from './utils/Setup';
import { Address } from 'fuels';
import { PredicateMock } from './mocks/Predicate';
import { predicateVersionMock } from './mocks/PredicateVersion';

test('Predicate Endpoints', async t => {
  const { app, users, close } = await TestEnvironment.init();

  t.after(async () => {
    await close();
  });

  await t.test(
    'POST /predicate should create a predicate without version code',
    async () => {
      const members = [users[0].payload.address, users[1].payload.address];
      const { predicatePayload } = await PredicateMock.create(1, members);

      const res = await request(app)
        .post(`/predicate`)
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address)
        .send(predicatePayload);

      assert.equal(res.status, 200);
      assert.ok('id' in res.body);
      assert.strictEqual(
        res.body.predicateAddress,
        new Address(predicatePayload.predicateAddress).toB256(),
      );
      assert.strictEqual(res.body.name, predicatePayload.name);
      assert.strictEqual(res.body.description, predicatePayload.description);
      assert.strictEqual(res.body.configurable, predicatePayload.configurable);
      assert.ok('address' in res.body.owner);
      assert.strictEqual(res.body.owner.address, users[0].payload.address);

      assert.equal(res.body.members.length, 2);
      assert.ok('avatar' in res.body.members[0]);
      assert.ok('address' in res.body.members[0]);
      assert.ok('type' in res.body.members[0]);
    },
  );

  await t.test(
    'POST /predicate should create a predicate with version code',
    async () => {
      const members = [users[0].payload.address, users[1].payload.address];
      const { predicatePayload } = await PredicateMock.create(1, members);

      const payload = {
        ...predicatePayload,
        version: predicateVersionMock.code,
      };

      const res = await request(app)
        .post(`/predicate`)
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address)
        .send(payload);

      assert.equal(res.status, 200);
      assert.ok('id' in res.body);
      assert.strictEqual(
        res.body.predicateAddress,
        new Address(predicatePayload.predicateAddress).toB256(),
      );
      assert.strictEqual(res.body.name, predicatePayload.name);
      assert.strictEqual(res.body.description, predicatePayload.description);
      assert.strictEqual(res.body.configurable, predicatePayload.configurable);
      assert.ok('address' in res.body.owner);
      assert.strictEqual(res.body.owner.address, users[0].payload.address);

      assert.equal(res.body.members.length, 2);
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
    const membersPayload = [
      users[0].payload.address,
      users[1].payload.address,
      users[2].payload.address,
    ];
    const { predicatePayload } = await PredicateMock.create(3, membersPayload);

    const { body: data_predicate } = await request(app)
      .post('/predicate')
      .send(predicatePayload)
      .set('Authorization', users[0].token)
      .set('signeraddress', users[0].payload.address);

    const res = await request(app)
      .get(`/predicate/${data_predicate.id}`)
      .set('Authorization', users[0].token)
      .set('signeraddress', users[0].payload.address);

    assert.equal(res.status, 200);
    assert.strictEqual(
      res.body.predicateAddress,
      new Address(predicatePayload.predicateAddress).toB256(),
    );
    assert.strictEqual(res.body.name, predicatePayload.name);
    assert.strictEqual(res.body.description, predicatePayload.description);
    assert.strictEqual(res.body.configurable, predicatePayload.configurable);
    assert.ok('members' in res.body);
    assert.ok('id' in res.body);

    const { members, id } = res.body;

    assert.equal(members.length, 3);
    assert.ok('address' in members[0]);
    assert.strictEqual(id, data_predicate.id);

    members.forEach(element => {
      const aux = members.find(m => element.id === m.id);
      assert.equal(!!aux, true);
    });
  });

  await t.test(
    'GET /predicate/by-name/:name should find predicate by name',
    async () => {
      const membersPayload = [users[0].payload.address, users[1].payload.address];
      const { predicatePayload } = await PredicateMock.create(2, membersPayload);

      const { body: predicate } = await request(app)
        .post('/predicate')
        .send(predicatePayload)
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address);

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
      const membersPayload = [users[0].payload.address];
      const { predicatePayload } = await PredicateMock.create(1, membersPayload);

      const { body: predicate } = await request(app)
        .post('/predicate')
        .send(predicatePayload)
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address);

      const res = await request(app)
        .get(`/predicate/by-address/${predicate.predicateAddress}`)
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address);

      assert.equal(res.status, 200);
      assert.ok('id' in res.body);
      assert.ok('owner' in res.body);
      assert.ok('members' in res.body);
      assert.strictEqual(
        res.body.predicateAddress,
        new Address(predicatePayload.predicateAddress).toB256(),
      );
      assert.strictEqual(res.body.name, predicatePayload.name);
      assert.strictEqual(res.body.description, predicatePayload.description);
      assert.strictEqual(res.body.configurable, predicatePayload.configurable);
      assert.equal(res.body.members.length, 1);
    },
  );

  await t.test(
    'GET /predicate/reserved-coins/:id should find predicate balance',
    async () => {
      const membersPayload = [users[0].payload.address];
      const { predicatePayload } = await PredicateMock.create(1, membersPayload);

      const { body: predicate } = await request(app)
        .post('/predicate')
        .send(predicatePayload)
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address);

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
});
