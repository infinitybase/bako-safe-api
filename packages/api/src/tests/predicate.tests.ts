import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { TestEnvironment } from './utils/Setup';
import { PredicateMock } from '@src/mocks/predicate';
import { Address, ZeroBytes32 } from 'fuels';

test('POST /predicate should create predicate without version', async t => {
  const { app, users, close, predicates } = await TestEnvironment.init(2, 1);

  t.after(async () => {
    await close();
  });

  await t.test('should create a predicate without version', async () => {
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
      .send(payload)
      .set('Authorization', users[0].token)
      .set('Signeraddress', users[0].payload.address);

    assert.equal(res.status, 201);
    assert.ok(res.body.id);
    assert.deepEqual(res.body.configurable, configurable);
    assert.equal(res.body.description, payload.description);
    assert.equal(res.body.predicateAddress, predicateAddress);
    assert.equal(res.body.owner.address, users[0].payload.address);
    assert.equal(
      res.body.members.length,
      vault.configurable.SIGNERS.filter(i => i != ZeroBytes32).length,
    );
  });
});
