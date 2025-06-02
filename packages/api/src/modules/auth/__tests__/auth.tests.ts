import test from 'node:test';
import assert from 'node:assert';
import App from '@src/server/app';
import request from 'supertest';
import { TypeUser } from '@src/models';
import { newUser } from '@src/tests/mocks/User';
import { networks } from '@src/tests/mocks/Networks';

test('AuthController endpoints', async t => {
  const appInstance = await App.start();
  const server = appInstance.serverApp;

  t.after(async () => {
    await App.stop();
  });

  await t.test('POST /user should create user and autenticate', async () => {
    const { payload, wallet } = newUser();
    const res = await request(server).post('/user').send(payload);
    assert.strictEqual(res.status, 201);

    assert.ok(res.body.code);

    const signature = await wallet.signMessage(res.body.code);
    const authRes = await request(server).post('/auth/sign-in').send({
      digest: res.body.code,
      encoder: TypeUser.FUEL,
      signature,
      userAddress: payload.address,
    });

    assert.strictEqual(authRes.status, 200);
    assert.ok(authRes.body.accessToken);
    assert.strictEqual(authRes.body.address, payload.address);
  });

  await t.test(
    'POST /auth/code should allow regenerating code and authenticating with new one',
    async () => {
      const { payload, wallet } = newUser();

      const createRes = await request(server).post('/user').send(payload);
      assert.strictEqual(createRes.status, 201);
      const firstCode = createRes.body.code;
      assert.ok(firstCode);

      const codeRes = await request(server).post('/auth/code').send({
        name: payload.name,
        networkUrl: networks['LOCAL'],
        origin: 'http://localhost',
      });

      assert.strictEqual(codeRes.status, 200);
      const newCode = codeRes.body.code;
      assert.ok(newCode);
      assert.notStrictEqual(newCode, firstCode);

      const signature = await wallet.signMessage(newCode);
      const authRes = await request(server).post('/auth/sign-in').send({
        digest: newCode,
        encoder: TypeUser.FUEL,
        signature,
        userAddress: payload.address,
      });

      assert.strictEqual(authRes.status, 200);
      assert.ok(authRes.body.accessToken);
    },
  );

  await t.test('POST /auth/code should generate code successfully', async () => {
    const { payload } = newUser();
    const createRes = await request(server).post('/user').send(payload);
    assert.strictEqual(createRes.status, 201);

    const codeRes = await request(server).post('/auth/code').send({
      name: payload.name,
      networkUrl: networks['LOCAL'],
    });

    assert.strictEqual(codeRes.status, 200);
    assert.ok(codeRes.body.code);
  });

  await t.test('POST /auth/sign-out should succeed', async () => {
    const { payload, wallet } = newUser();
    const createRes = await request(server).post('/user').send(payload);
    assert.strictEqual(createRes.status, 201);

    const signature = await wallet.signMessage(createRes.body.code);
    const authRes = await request(server).post('/auth/sign-in').send({
      digest: createRes.body.code,
      encoder: TypeUser.FUEL,
      signature,
      userAddress: payload.address,
    });

    assert.strictEqual(authRes.status, 200);
    const token = authRes.body.accessToken;
    assert.ok(token);

    const logoutRes = await request(server)
      .delete('/auth/sign-out')
      .set('Authorization', token);

    assert.strictEqual(logoutRes.status, 200);
  });
});
