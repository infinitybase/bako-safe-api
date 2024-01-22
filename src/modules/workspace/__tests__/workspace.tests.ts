import axios from 'axios';
import { Address } from 'fuels';

import { accounts } from '@src/mocks/accounts';
import { networks, providers } from '@src/mocks/networks';
import { PermissionRoles, defaultPermissions } from '@src/models/Workspace';
import { AuthValidations } from '@src/utils/testUtils/Auth';
import { generateWorkspacePayload } from '@src/utils/testUtils/Workspace';

describe('[WORKSPACE]', () => {
  let api: AuthValidations;
  beforeAll(async () => {
    api = new AuthValidations(networks['local'], accounts['USER_1']);

    await api.create();
    await api.createSession();
  });

  test(
    'List workspaces to user',
    async () => {
      const { data, status } = await api.axios.get(
        `/workspace/by-user/${accounts['USER_1'].address}`,
      );

      expect(status).toBe(200);
      expect(data).toBeInstanceOf(Array);

      expect(data[0]).toHaveProperty('id');
      expect(data[0]).toHaveProperty('owner');
      expect(data[0]).toHaveProperty('members');
      expect(data[0]).toHaveProperty('single', false);
      expect(data[0]).toHaveProperty('permissions');
    },
    40 * 1000,
  );

  test(
    'Create workspace',
    async () => {
      const {
        data,
        data_user1,
        data_user2,
        USER_5,
        status,
      } = await generateWorkspacePayload(api);
      const notOwner = data.members.filter(m => m.id !== data.owner.id);

      expect(status).toBe(201);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('owner');
      expect(data).toHaveProperty('members');
      expect(data.members).toHaveLength(notOwner.length + 1);
      expect(data.permissions[data.owner.id]).toStrictEqual(
        defaultPermissions[PermissionRoles.OWNER],
      );
      expect(data.permissions[data_user1.id]).toStrictEqual(
        defaultPermissions[PermissionRoles.VIEWER],
      );
      expect(data.permissions[data_user2.id]).toStrictEqual(
        defaultPermissions[PermissionRoles.VIEWER],
      );
      expect(data.permissions[USER_5.id]).toStrictEqual(
        defaultPermissions[PermissionRoles.VIEWER],
      );
    },
    60 * 1000,
  );

  test(
    'Find workspace by ID',
    async () => {
      const { data } = await generateWorkspacePayload(api);

      const { data: workspace, status: status_find } = await api.axios.get(
        `/workspace/${data.id}`,
      );

      expect(status_find).toBe(200);
      expect(workspace).toHaveProperty('id');
      expect(workspace.id).toBe(data.id);
      expect(workspace).toHaveProperty('owner');
      expect(workspace.owner).toEqual(data.owner);
      expect(workspace).toHaveProperty('members');
      expect(workspace.members).toHaveLength(data.members.length);
    },
    60 * 1000,
  );

  test('Update workspace', async () => {
    const { data } = await generateWorkspacePayload(api);

    const { data: workspace, status: status_find } = await api.axios.get(
      `/workspace/${data.id}`,
    );

    const { data: workspace_updated, status: status_update } = await api.axios.put(
      `/workspace/${data.id}`,
      {
        name: 'Workspace 1 updated',
        description: 'Workspace 1 description updated',
      },
    );

    expect(status_find).toBe(200);
    expect(workspace).toHaveProperty('id');
    expect(workspace.id).toBe(data.id);
    expect(workspace).toHaveProperty('owner');
    expect(workspace.owner).toEqual(data.owner);
    expect(workspace).toHaveProperty('members');
    expect(workspace.members).toHaveLength(data.members.length);

    expect(status_update).toBe(200);
    expect(workspace_updated).toHaveProperty('id');
    expect(workspace_updated.id).toBe(data.id);
    expect(workspace_updated).toHaveProperty('owner');
    expect(workspace_updated.owner).toEqual(data.owner);
    expect(workspace_updated).toHaveProperty('members');
    expect(workspace_updated.members).toHaveLength(data.members.length);
    expect(workspace_updated).toHaveProperty('name', 'Workspace 1 updated');
    expect(workspace_updated).toHaveProperty(
      'description',
      'Workspace 1 description updated',
    );
  });

  test(
    'Upgrade workspace permissions',
    async () => {
      const { data } = await generateWorkspacePayload(api);

      const { data: workspace, status: status_find } = await api.axios.get(
        `/workspace/${data.id}`,
      );

      const notOwner = workspace.members.filter(m => m.id !== workspace.owner.id);

      const {
        data: workspace_updated,
        status: status_update,
      } = await api.axios.put(`/workspace/${data.id}/permissions`, {
        permissions: {
          ...workspace.permissions,
          [notOwner[0].id]: defaultPermissions[PermissionRoles.OWNER],
          [notOwner[1].id]: defaultPermissions[PermissionRoles.VIEWER],
        },
      });

      expect(status_find).toBe(200);
      expect(workspace).toHaveProperty('id');
      expect(workspace.id).toBe(data.id);
      expect(workspace).toHaveProperty('owner');
      expect(workspace.owner).toEqual(data.owner);
      expect(workspace).toHaveProperty('members');
      expect(workspace.members).toHaveLength(data.members.length);

      expect(status_update).toBe(200);
      expect(workspace_updated).toHaveProperty('id');
      expect(workspace_updated.id).toBe(data.id);
      expect(workspace_updated).toHaveProperty('owner');
      expect(workspace_updated.owner).toEqual(data.owner);
      expect(workspace_updated).toHaveProperty('members');
      expect(workspace_updated.members).toHaveLength(data.members.length);
      expect(workspace_updated).toHaveProperty('permissions', {
        ...workspace.permissions,
        [notOwner[0].id]: defaultPermissions[PermissionRoles.OWNER],
        [notOwner[1].id]: defaultPermissions[PermissionRoles.VIEWER],
      });
    },
    40 * 1000,
  );

  test('Upgrade workspace members', async () => {
    const { data } = await generateWorkspacePayload(api);

    const { data: workspace, status: status_find } = await api.axios.get(
      `/workspace/${data.id}`,
    );

    const notOwner = workspace.members.filter(m => m.id !== workspace.owner.id);
    const new_members = [notOwner[0].id, workspace.owner.id, notOwner[1].address];

    const { data: workspace_updated, status: status_update } = await api.axios.put(
      `/workspace/${data.id}/members`,
      {
        members: new_members,
      },
    );

    expect(status_find).toBe(200);
    expect(workspace).toHaveProperty('id');
    expect(workspace.id).toBe(data.id);
    expect(workspace).toHaveProperty('owner');
    expect(workspace.owner).toEqual(data.owner);
    expect(workspace).toHaveProperty('members');
    expect(workspace.members).toHaveLength(data.members.length);

    expect(status_update).toBe(200);
    expect(workspace_updated).toHaveProperty('id');
    expect(workspace_updated.id).toBe(data.id);
    expect(workspace_updated).toHaveProperty('owner');
    expect(workspace_updated.owner).toEqual(data.owner);
    expect(workspace_updated).toHaveProperty('members');
    expect(workspace_updated.members).toHaveLength(new_members.length);
    expect(workspace_updated.permissions).toEqual({
      [workspace.owner.id]: defaultPermissions[PermissionRoles.OWNER],
      [notOwner[0].id]: defaultPermissions[PermissionRoles.VIEWER],
    });
  });

  test('Cannot remove owner from workspace', async () => {
    const { data } = await generateWorkspacePayload(api);

    const { data: workspace, status: status_find } = await api.axios.get(
      `/workspace/${data.id}`,
    );

    const { status, data: workspace_error } = await api.axios
      .put(`/workspace/${data.id}/members`, {
        members: [workspace.members[1].id],
      })
      .catch(e => e.response);

    expect(status_find).toBe(200);
    expect(workspace).toHaveProperty('id');
    expect(workspace.id).toBe(data.id);
    expect(workspace).toHaveProperty('owner');
    expect(workspace.owner).toEqual(data.owner);
    expect(workspace).toHaveProperty('members');
    expect(workspace.members).toHaveLength(data.members.length);

    expect(status).toBe(400);
    expect(workspace_error).toEqual('Owner cannot be removed');
  });
});
