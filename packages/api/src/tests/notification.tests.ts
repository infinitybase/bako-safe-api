import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { TestEnvironment } from './utils/Setup';
import { createNofitications } from './mocks/Nofitication';
import { saveMockPredicate } from './mocks/Predicate';
import { NotificationTitle } from '@src/models';
import { generateNode } from './mocks/Networks';

test('Notifications Endpoints', async t => {
  const { provider, node } = await generateNode();

  const { app, users, predicates, network, close } = await TestEnvironment.init(
    2,
    1,
    node,
    provider,
  );
  const vault = predicates[0];
  const { predicate } = await saveMockPredicate(vault, users[0], app);
  await createNofitications(predicate, users[0], network);
  t.after(async () => {
    await close();
  });
  await t.test('GET /notifications should list user notifications', async () => {
    const page = 0;
    const perPage = 8;
    const resPage = await request(app)
      .get(`/notifications?page=${page}&perPage=${perPage}&orderBy=title&sort=ASC`)
      .set('Authorization', users[0].token)
      .set('signeraddress', users[0].payload.address);
    function hasTwoNotifysWithTitle(data: Notification[], title: string): boolean {
      const count = data.filter(item => item.title === title).length;
      return count === 2;
    }
    assert.equal(resPage.status, 200);
    assert.ok('data' in resPage.body);
    assert.ok('summary' in resPage.body.data[0]);
    assert.equal(resPage.body.data[0].summary.vaultId, predicate.id);
    assert.equal(resPage.body.data[0].summary.vaultName, predicate.name);
    assert.ok(resPage.body.data.length <= perPage);
    assert.equal(resPage.body.data.length, 8);
    assert.ok('total' in resPage.body);
    assert.ok(
      hasTwoNotifysWithTitle(
        resPage.body.data,
        NotificationTitle.NEW_VAULT_CREATED,
      ),
    );
    assert.ok(
      hasTwoNotifysWithTitle(
        resPage.body.data,
        NotificationTitle.TRANSACTION_CREATED,
      ),
    );
    assert.ok(
      hasTwoNotifysWithTitle(
        resPage.body.data,
        NotificationTitle.TRANSACTION_COMPLETED,
      ),
    );
    assert.ok(
      hasTwoNotifysWithTitle(
        resPage.body.data,
        NotificationTitle.TRANSACTION_DECLINED,
      ),
    );
  });
  await t.test(
    'PUT /notifications/read-all should update all notifications as read',
    async () => {
      const resUpdate = await request(app)
        .put('/notifications/read-all')
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address);
      assert.equal(resUpdate.status, 200);
      assert.equal(resUpdate.body, true);
      const res = await request(app)
        .get(`/notifications`)
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address);
      res.body.forEach(element => {
        assert.ok('read' in element);
        assert.equal(element.read, true);
      });
    },
  );
});
