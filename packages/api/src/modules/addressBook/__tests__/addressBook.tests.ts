import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import App from '../../../server/app';

let app;

test('Setup app and database', async t => {
  const appInstance = await App.start();
  app = appInstance.serverApp;

  // t.teardown(async () => {
  //   await App.stop(); // importante usar await
  // });

  t.after(async () => {
    await App.stop();
  });

  assert.ok(App, 'App module should be imported');
});
