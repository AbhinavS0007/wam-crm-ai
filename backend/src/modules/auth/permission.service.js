import { DEFAULT_ROLE_PERMISSIONS, PERMISSION_VALUES } from '../../constants/permissions.js';

export const getDefaultPermissionsForRole = (role) => DEFAULT_ROLE_PERMISSIONS[role] ?? [];

export const resolveUserPermissions = (user) => {
  const defaultPermissions = getDefaultPermissionsForRole(user.role);
  const allowOverrides = user.permissionOverrides?.allow ?? [];
  const denyOverrides = user.permissionOverrides?.deny ?? [];

  const resolvedPermissions = new Set(defaultPermissions);

  allowOverrides.forEach((permission) => {
    if (PERMISSION_VALUES.includes(permission)) {
      resolvedPermissions.add(permission);
    }
  });

  denyOverrides.forEach((permission) => {
    resolvedPermissions.delete(permission);
  });

  return [...resolvedPermissions].sort();
};

export const userHasPermission = ({ user, permission }) =>
  resolveUserPermissions(user).includes(permission);

export const userHasEveryPermission = ({ user, permissions }) =>
  permissions.every((permission) =>
    userHasPermission({
      user,
      permission,
    }),
  );
