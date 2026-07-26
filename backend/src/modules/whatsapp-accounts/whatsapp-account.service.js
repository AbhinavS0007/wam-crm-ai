import { ACCOUNT_STATUSES } from '../../constants/account-statuses.js';
import { deleteAuthStateForAccount } from '../whatsapp-auth-states/whatsapp-auth-state.repository.js';
import { getSessionManager } from '../whatsapp/sessions/session-manager.instance.js';
import {
  createAccountRecord,
  findAccountByBrandKey,
  findAccountById,
  findAccountsByOrganization,
  softRemoveAccount,
  updateAccountStatus,
} from './whatsapp-account.repository.js';
import { serializeWhatsAppAccount } from './whatsapp-account.serializer.js';

const withRuntime = (account) => {
  const serialized = serializeWhatsAppAccount(account);
  const runtime = getSessionManager().getSessionState(account._id);

  return {
    ...serialized,
    runtime: {
      running: Boolean(runtime.running),
      qrAvailable: Boolean(runtime.qrAvailable),
    },
  };
};

const loadAccount = async ({ organizationId, accountId }) => {
  const account = await findAccountById({ accountId, organizationId });

  if (!account) {
    throw new Error('ACCOUNT_NOT_FOUND');
  }

  return account;
};

export const listAccountsForOrganization = async ({ organizationId, status, limit, skip }) => {
  const accounts = await findAccountsByOrganization({ organizationId, status, limit, skip });

  return accounts.map((account) => withRuntime(account));
};

export const getAccountForOrganization = async ({ organizationId, accountId }) => {
  const account = await loadAccount({ organizationId, accountId });
  return withRuntime(account);
};

export const createAccountForActor = async ({
  organizationId,
  actor,
  name,
  brandKey,
  description,
}) => {
  const existing = await findAccountByBrandKey({ organizationId, brandKey });

  if (existing) {
    throw new Error('ACCOUNT_BRAND_KEY_EXISTS');
  }

  const account = await createAccountRecord({
    organizationId,
    name,
    brandKey,
    description,
    ownerUserId: actor._id,
    createdBy: actor._id,
  });

  return withRuntime(account);
};

export const connectAccountForActor = async ({ organizationId, accountId, pairingPhoneNumber }) => {
  const account = await loadAccount({ organizationId, accountId });
  await getSessionManager().connectAccount({ account, pairingPhoneNumber });
  const refreshed = await loadAccount({ organizationId, accountId });
  return withRuntime(refreshed);
};

export const getAccountQrForActor = async ({ organizationId, accountId }) => {
  await loadAccount({ organizationId, accountId });
  const manager = getSessionManager();
  const qrDataUrl = await manager.getQrDataUrl(accountId);
  const pairingCode = manager.getPairingCode ? manager.getPairingCode(accountId) : null;
  return { qrDataUrl: qrDataUrl ?? null, pairingCode: pairingCode ?? null };
};

export const pauseAccountForActor = async ({ organizationId, accountId }) => {
  await loadAccount({ organizationId, accountId });
  await getSessionManager().disconnectAccount({
    accountId,
    organizationId,
    status: ACCOUNT_STATUSES.PAUSED,
    disconnectCode: 'manual_pause',
    disconnectReason: 'Account paused from the app.',
  });
  const refreshed = await loadAccount({ organizationId, accountId });
  return withRuntime(refreshed);
};

export const resumeAccountForActor = async ({ organizationId, accountId }) => {
  await loadAccount({ organizationId, accountId });
  const account = await updateAccountStatus({
    accountId,
    organizationId,
    status: ACCOUNT_STATUSES.DISCONNECTED,
    disconnectCode: 'manual_resume',
    disconnectReason: 'Account resumed; ready to connect.',
  });
  return withRuntime(account);
};

export const resetAccountForActor = async ({ organizationId, accountId }) => {
  await loadAccount({ organizationId, accountId });
  await getSessionManager().disconnectAccount({
    accountId,
    organizationId,
    status: ACCOUNT_STATUSES.DISCONNECTED,
    disconnectCode: 'connection_reset',
    disconnectReason: 'Connection reset; stored login was cleared.',
  });
  await deleteAuthStateForAccount({ organizationId, whatsappAccountId: accountId });
  const refreshed = await loadAccount({ organizationId, accountId });
  return withRuntime(refreshed);
};

export const disconnectAccountForActor = async ({ organizationId, accountId }) => {
  await loadAccount({ organizationId, accountId });
  await getSessionManager().disconnectAccount({ accountId, organizationId });
  const refreshed = await loadAccount({ organizationId, accountId });
  return withRuntime(refreshed);
};

export const removeAccountForActor = async ({ organizationId, accountId, actor }) => {
  await loadAccount({ organizationId, accountId });
  await getSessionManager().disconnectAccount({
    accountId,
    organizationId,
    status: ACCOUNT_STATUSES.REMOVED,
    disconnectCode: 'account_removed',
    disconnectReason: 'Account removed from the app.',
  });
  const account = await softRemoveAccount({ accountId, organizationId, actorId: actor._id });
  return serializeWhatsAppAccount(account);
};
