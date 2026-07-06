import {
  serializeDate,
  serializeId,
  serializeIdArray,
  toPlainObject,
} from '../../utils/serialization.js';

export const serializeUser = (user) => {
  const value = toPlainObject(user);

  if (!value) {
    return null;
  }

  return {
    id: serializeId(value._id),
    organizationId: serializeId(value.organizationId),
    name: value.name,
    email: value.email,
    role: value.role,
    permissionOverrides: {
      allow: value.permissionOverrides?.allow ?? [],
      deny: value.permissionOverrides?.deny ?? [],
    },
    accountAccessMode: value.accountAccessMode,
    accountAccess: serializeIdArray(value.accountAccess),
    status: value.status,
    mustChangePassword: Boolean(value.mustChangePassword),
    passwordChangedAt: serializeDate(value.passwordChangedAt),
    lastLoginAt: serializeDate(value.lastLoginAt),
    createdBy: serializeId(value.createdBy),
    updatedBy: serializeId(value.updatedBy),
    createdAt: serializeDate(value.createdAt),
    updatedAt: serializeDate(value.updatedAt),
  };
};
