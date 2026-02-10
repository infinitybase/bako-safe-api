import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { TestEnvironment } from './utils/Setup';
import { generateNode } from './mocks/Networks';
import { PermissionRoles } from '@src/models/Workspace';

test('Workspace Endpoints', async t => {
  const { node } = await generateNode();

  const { app, users, close } = await TestEnvironment.init(3, 0, node);

  t.after(async () => {
    await close();
  });

  let createdWorkspaceId: string;

  await t.test('POST /workspace should create a new workspace', async () => {
    const workspacePayload = {
      name: `Test Workspace ${Date.now()}`,
      description: 'A test workspace for e2e tests',
      members: [],
    };

    const res = await request(app)
      .post('/workspace')
      .set('Authorization', users[0].token)
      .set('signeraddress', users[0].payload.address)
      .send(workspacePayload);

    assert.equal(res.status, 201);
    assert.ok(res.body.id);
    assert.equal(res.body.name, workspacePayload.name);
    assert.equal(res.body.description, workspacePayload.description);
    assert.ok(res.body.owner);
    assert.equal(res.body.owner.id, users[0].id);

    createdWorkspaceId = res.body.id;
  });

  await t.test('GET /workspace/by-user should list user workspaces', async () => {
    const res = await request(app)
      .get('/workspace/by-user')
      .set('Authorization', users[0].token)
      .set('signeraddress', users[0].payload.address);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 1);

    const workspace = res.body.find(w => w.id === createdWorkspaceId);
    assert.ok(workspace);
  });

  await t.test('GET /workspace/:id should find workspace by id', async () => {
    const res = await request(app)
      .get(`/workspace/${createdWorkspaceId}`)
      .set('Authorization', users[0].token)
      .set('signeraddress', users[0].payload.address);

    assert.equal(res.status, 200);
    assert.equal(res.body.id, createdWorkspaceId);
    assert.ok(res.body.owner);
    assert.ok(res.body.members);
  });

  await t.test('PUT /workspace should update workspace', async () => {
    const updatedName = `Updated Workspace ${Date.now()}`;

    const res = await request(app)
      .put('/workspace')
      .set('Authorization', users[0].token)
      .set('signeraddress', users[0].payload.address)
      .set('workspaceid', createdWorkspaceId)
      .send({
        name: updatedName,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.name, updatedName);
  });

  await t.test(
    'POST /workspace/members/:member/include should add member to workspace',
    async () => {
      const res = await request(app)
        .post(`/workspace/members/${users[1].id}/include`)
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address)
        .set('workspaceid', createdWorkspaceId);

      assert.equal(res.status, 200);

      const memberIds = res.body.members.map(m => m.id);
      assert.ok(memberIds.includes(users[1].id));
    },
  );

  await t.test(
    'PUT /workspace/permissions/:member should update member permissions',
    async () => {
      const newPermissions = {
        [PermissionRoles.VIEWER]: ['*'],
        [PermissionRoles.ADMIN]: [],
      };

      const res = await request(app)
        .put(`/workspace/permissions/${users[1].id}`)
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address)
        .set('workspaceid', createdWorkspaceId)
        .send({ permissions: newPermissions });

      assert.equal(res.status, 200);
      assert.ok(res.body.permissions);
      assert.ok(res.body.permissions[users[1].id]);
    },
  );

  await t.test(
    'PUT /workspace/permissions/:member should not allow owner to change own permissions',
    async () => {
      const newPermissions = {
        [PermissionRoles.VIEWER]: ['*'],
      };

      const res = await request(app)
        .put(`/workspace/permissions/${users[0].id}`)
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address)
        .set('workspaceid', createdWorkspaceId)
        .send({ permissions: newPermissions });

      assert.equal(res.status, 401);
    },
  );

  await t.test(
    'POST /workspace/members/:member/remove should remove member from workspace',
    async () => {
      const res = await request(app)
        .post(`/workspace/members/${users[1].id}/remove`)
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address)
        .set('workspaceid', createdWorkspaceId);

      assert.equal(res.status, 200);

      const memberIds = res.body.members.map(m => m.id);
      assert.ok(!memberIds.includes(users[1].id));
    },
  );

  await t.test(
    'POST /workspace/members/:member/remove should not allow removing owner',
    async () => {
      const res = await request(app)
        .post(`/workspace/members/${users[0].id}/remove`)
        .set('Authorization', users[0].token)
        .set('signeraddress', users[0].payload.address)
        .set('workspaceid', createdWorkspaceId);

      assert.equal(res.status, 401);
    },
  );
});
