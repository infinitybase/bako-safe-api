import { Modules } from '@src/middlewares/permissions/types';
import Role, { PermissionsItem, Permissions } from '@src/models/Role';

type RoleName = 'Administrador';
// | 'Vendedor';

function createPermissionsItem(roleName: RoleName): PermissionsItem {
  let permissionsItem: Partial<PermissionsItem> = {};

  if (roleName === 'Administrador') {
    permissionsItem = {
      view: true,
      edit: true,
      remove: true,
    };
  } else {
    permissionsItem = {
      view: false,
      edit: false,
      remove: false,
    };
  }

  return permissionsItem as PermissionsItem;
}

function createPermissions(roleName: RoleName): Permissions {
  const permissionsObject: Partial<Permissions> = {};

  for (const moduleKey of Object.keys(Modules)) {
    const module = Modules[moduleKey as Modules];

    permissionsObject[module] = createPermissionsItem(roleName);
  }

  return permissionsObject as Permissions;
}

function updatePermissions(
  roleName: RoleName,
  existingPermissions: Permissions,
): Permissions {
  const updatedPermissions = { ...existingPermissions };

  for (const moduleKey of Object.keys(Modules)) {
    const module = Modules[moduleKey];

    updatedPermissions[module] = createPermissionsItem(roleName);
  }

  return updatedPermissions;
}

function hasAllModules(permissions: Permissions): boolean {
  for (const module of Object.keys(Modules)) {
    if (!Object.prototype.hasOwnProperty.call(permissions, module)) {
      return false;
    }
  }
  return true;
}

export default async function () {
  const roles: Partial<Role>[] = [
    {
      name: 'Administrador',
      permissions: createPermissions('Administrador'),
    },
    // {
    //   name: 'Vendedor',
    //   permissions: createPermissions('Vendedor'),
    // },
  ];

  const existingRoles = await Role.find({
    where: [
      { name: roles[0].name },
      // { name: roles[1].name }
    ],
  });

  if (existingRoles.length > 0) {
    for (const existingRole of existingRoles) {
      const existingRoleHasAllModules = hasAllModules(existingRole.permissions);

      if (!existingRoleHasAllModules) {
        const existingRolePermissions = updatePermissions(
          existingRole.name as RoleName,
          existingRole.permissions,
        );

        await Role.update(
          { id: existingRole.id },
          { permissions: existingRolePermissions },
        );
      }
    }

    return;
  }

  for (const role of roles) {
    await Role.create(role).save();
  }
}
