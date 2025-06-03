import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { TestEnvironment } from './utils/Setup';

test('Address Book Endpoints', async t => {
  const { app, users, network, close } = await TestEnvironment.init();

  t.after(async () => {
    await close();
  });

  await t.test('Create transaction', async () => {});
});
