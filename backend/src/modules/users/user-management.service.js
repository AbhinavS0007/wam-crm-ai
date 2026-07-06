import { ACCOUNT_ACCESS_MODES } from '../../constants/account-access-modes.js';
import { AUDIT_EVENTS } from '../../constants/audit-events.js';
import { AUDIT_OUTCOMES } from '../../constants/audit-outcomes.js';
import { ROLES } from '../../constants/roles.js';
import { USER_STATUSES } from '../../constants/user-statuses.js';
import { createAuditLog } from '../audit/audit.repository.js';
import { hashPassword, validatePlainPassword } from '../auth/password.service.js';
import { revokeActiveRefreshSessionsForUser } from '../auth/refresh-session.repository.js';

import {
  createUser,
  findUserByEmailInOrganization,
  findUserById,
  listUsersByOrganization,
  updateUserById,
} from './user.repository.js';
import { serializeUser } from './user.serializer.js';

const createUserManagementError = (code) => new Error(code);

const assertTargetUserCanBeManaged = ({ actor, targetUser }) => {
  if (!targetUser) {
    throw createUserManagementError('USER_NOT_FOUND');
  }

  if (targetUser.role === ROLES.SUPER_ADMIN) {
    throw createUserManagementError('SUPER_ADMIN_CANNOT_BE_MANAGED');
  }

  if (actor._id.toString() === targetUser._id.toString()) {
    throw createUserManagementError('USER_CANNOT_MANAGE_SELF');
  }
};

const createUserAuditLog = ({
  organizationId,
  eventType,
  actorId,
  targetUserId,
  reasonCode,
  requestContext,
  metadata = {},
}) =>
  createAuditLog({
    organizationId,
    eventType,
    actorId,
    targetUserId,
    outcome: AUDIT_OUTCOMES.SUCCESS,
    reasonCode,
    requestId: requestContext?.requestId ?? null,
    ipAddress: requestContext?.ipAddress ?? null,
    userAgent: requestContext?.userAgent ?? null,
    metadata: {
      source: 'user-management',
      ...metadata,
    },
  });

export const listOrganizationUsers = async ({ organizationId, role, status, limit, skip }) => {
  const users = await listUsersByOrganization({
    organizationId,
    role,
    status,
    limit,
    skip,
  });

  return users.map((user) => serializeUser(user));
};

export const getOrganizationUser = async ({ organizationId, userId }) => {
  const user = await findUserById({
    userId,
    organizationId,
  });

  if (!user) {
    throw createUserManagementError('USER_NOT_FOUND');
  }

  return serializeUser(user);
};

export const createOrganizationUser = async ({
  organizationId,
  actor,
  userData,
  requestContext,
}) => {
  if (userData.role === ROLES.SUPER_ADMIN) {
    throw createUserManagementError('SUPER_ADMIN_CANNOT_BE_CREATED_BY_API');
  }

  const passwordValidation = validatePlainPassword(userData.password);

  if (!passwordValidation.valid) {
    throw createUserManagementError(passwordValidation.reasonCode);
  }

  const existingUser = await findUserByEmailInOrganization({
    organizationId,
    email: userData.email,
  });

  if (existingUser) {
    throw createUserManagementError('USER_EMAIL_ALREADY_EXISTS');
  }

  const passwordHash = await hashPassword(userData.password);

  const user = await createUser({
    organizationId,
    name: userData.name,
    email: userData.email,
    passwordHash,
    role: userData.role,
    permissionOverrides: userData.permissionOverrides,
    accountAccessMode: userData.accountAccessMode,
    accountAccess:
      userData.accountAccessMode === ACCOUNT_ACCESS_MODES.ALL ? [] : userData.accountAccess,
    status: USER_STATUSES.ACTIVE,
    mustChangePassword: userData.mustChangePassword,
    createdBy: actor._id,
    updatedBy: actor._id,
  });

  await createUserAuditLog({
    organizationId,
    eventType: AUDIT_EVENTS.USER_CREATED,
    actorId: actor._id,
    targetUserId: user._id,
    reasonCode: 'user_created',
    requestContext,
  });

  return serializeUser(user);
};

export const updateOrganizationUser = async ({
  organizationId,
  actor,
  userId,
  updateData,
  requestContext,
}) => {
  const targetUser = await findUserById({
    userId,
    organizationId,
  });

  assertTargetUserCanBeManaged({
    actor,
    targetUser,
  });

  const sanitizedUpdateData = {
    ...updateData,
    updatedBy: actor._id,
  };

  if (sanitizedUpdateData.role === ROLES.SUPER_ADMIN) {
    throw createUserManagementError('SUPER_ADMIN_CANNOT_BE_ASSIGNED_BY_API');
  }

  if (sanitizedUpdateData.accountAccessMode === ACCOUNT_ACCESS_MODES.ALL) {
    sanitizedUpdateData.accountAccess = [];
  }

  const updatedUser = await updateUserById({
    userId,
    organizationId,
    updateData: sanitizedUpdateData,
  });

  await createUserAuditLog({
    organizationId,
    eventType: AUDIT_EVENTS.USER_UPDATED,
    actorId: actor._id,
    targetUserId: updatedUser._id,
    reasonCode: 'user_updated',
    requestContext,
    metadata: {
      updatedFields: Object.keys(updateData),
    },
  });

  return serializeUser(updatedUser);
};

export const disableOrganizationUser = async ({
  organizationId,
  actor,
  userId,
  requestContext,
}) => {
  const targetUser = await findUserById({
    userId,
    organizationId,
  });

  assertTargetUserCanBeManaged({
    actor,
    targetUser,
  });

  const updatedUser = await updateUserById({
    userId,
    organizationId,
    updateData: {
      status: USER_STATUSES.DISABLED,
      updatedBy: actor._id,
    },
  });

  await revokeActiveRefreshSessionsForUser({
    userId,
    revokeReason: 'user_disabled',
  });

  await createUserAuditLog({
    organizationId,
    eventType: AUDIT_EVENTS.USER_DISABLED,
    actorId: actor._id,
    targetUserId: updatedUser._id,
    reasonCode: 'user_disabled',
    requestContext,
  });

  return serializeUser(updatedUser);
};

export const enableOrganizationUser = async ({ organizationId, actor, userId, requestContext }) => {
  const targetUser = await findUserById({
    userId,
    organizationId,
  });

  assertTargetUserCanBeManaged({
    actor,
    targetUser,
  });

  const updatedUser = await updateUserById({
    userId,
    organizationId,
    updateData: {
      status: USER_STATUSES.ACTIVE,
      updatedBy: actor._id,
    },
  });

  await createUserAuditLog({
    organizationId,
    eventType: AUDIT_EVENTS.USER_ENABLED,
    actorId: actor._id,
    targetUserId: updatedUser._id,
    reasonCode: 'user_enabled',
    requestContext,
  });

  return serializeUser(updatedUser);
};

export const resetOrganizationUserPassword = async ({
  organizationId,
  actor,
  userId,
  password,
  mustChangePassword,
  requestContext,
}) => {
  const targetUser = await findUserById({
    userId,
    organizationId,
  });

  assertTargetUserCanBeManaged({
    actor,
    targetUser,
  });

  const passwordValidation = validatePlainPassword(password);

  if (!passwordValidation.valid) {
    throw createUserManagementError(passwordValidation.reasonCode);
  }

  const passwordHash = await hashPassword(password);

  const updatedUser = await updateUserById({
    userId,
    organizationId,
    updateData: {
      passwordHash,
      mustChangePassword,
      passwordChangedAt: new Date(),
      updatedBy: actor._id,
    },
  });

  await revokeActiveRefreshSessionsForUser({
    userId,
    revokeReason: 'password_reset',
  });

  await createUserAuditLog({
    organizationId,
    eventType: AUDIT_EVENTS.USER_PASSWORD_RESET,
    actorId: actor._id,
    targetUserId: updatedUser._id,
    reasonCode: 'password_reset',
    requestContext,
  });

  return serializeUser(updatedUser);
};
