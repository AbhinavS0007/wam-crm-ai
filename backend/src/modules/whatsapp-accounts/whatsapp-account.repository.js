import { ACCOUNT_STATUSES } from '../../constants/account-statuses.js';
import {
  decryptAccountJidFromStorage,
  decryptAccountPhoneFromStorage,
  encryptAccountJidForStorage,
  encryptAccountPhoneForStorage,
} from '../privacy/protected-pii.service.js';
import { WhatsAppAccount } from './whatsapp-account.model.js';

export const createAccountRecord = (accountData) => WhatsAppAccount.create(accountData);

export const findAccountById = ({ accountId, organizationId, includeEncrypted = false } = {}) => {
  const filter = {
    _id: accountId,
  };

  if (organizationId) {
    filter.organizationId = organizationId;
  }

  let query = WhatsAppAccount.findOne(filter);

  if (includeEncrypted) {
    query = query.select('+encryptedPhone +encryptedJid');
  }

  return query.exec();
};

export const findAccountByBrandKey = ({ organizationId, brandKey } = {}) =>
  WhatsAppAccount.findOne({
    organizationId,
    brandKey,
  }).exec();

export const findAccountsByOrganization = ({
  organizationId,
  status,
  limit = 50,
  skip = 0,
} = {}) => {
  const filter = {
    organizationId,
  };

  if (status) {
    filter.status = status;
  }

  return WhatsAppAccount.find(filter)
    .sort({
      createdAt: -1,
    })
    .skip(skip)
    .limit(limit)
    .exec();
};

export const updateAccountStatus = ({
  accountId,
  organizationId,
  status,
  disconnectCode,
  disconnectReason,
  actorId,
  now = new Date(),
}) => {
  const updateData = {
    status,
  };

  if (actorId) {
    updateData.updatedBy = actorId;
  }

  if (status === ACCOUNT_STATUSES.ACTIVE) {
    updateData.lastConnectedAt = now;
    updateData.lastDisconnectedAt = null;
    updateData.disconnectCode = null;
    updateData.disconnectReason = null;
  }

  if (
    [
      ACCOUNT_STATUSES.DISCONNECTED,
      ACCOUNT_STATUSES.PAUSED,
      ACCOUNT_STATUSES.BLOCKED,
      ACCOUNT_STATUSES.REMOVED,
    ].includes(status)
  ) {
    updateData.lastDisconnectedAt = now;

    if (disconnectCode !== undefined) {
      updateData.disconnectCode = disconnectCode;
    }

    if (disconnectReason !== undefined) {
      updateData.disconnectReason = disconnectReason;
    }
  }

  return WhatsAppAccount.findOneAndUpdate(
    {
      _id: accountId,
      organizationId,
    },
    updateData,
    {
      returnDocument: 'after',
      runValidators: true,
    },
  ).exec();
};

export const softRemoveAccount = ({
  accountId,
  organizationId,
  actorId,
  now = new Date(),
} = {}) => {
  const updateData = {
    status: ACCOUNT_STATUSES.REMOVED,
    removedAt: now,
    lastDisconnectedAt: now,
  };

  if (actorId) {
    updateData.updatedBy = actorId;
  }

  return WhatsAppAccount.findOneAndUpdate(
    {
      _id: accountId,
      organizationId,
    },
    updateData,
    {
      returnDocument: 'after',
      runValidators: true,
    },
  ).exec();
};

export const setAccountEncryptedIdentifiers = ({ accountId, organizationId, phone, jid } = {}) => {
  const update = {};

  if (phone !== undefined) {
    update.encryptedPhone = encryptAccountPhoneForStorage(phone);
  }

  if (jid !== undefined) {
    update.encryptedJid = encryptAccountJidForStorage(jid);
  }

  return WhatsAppAccount.findOneAndUpdate(
    {
      _id: accountId,
      organizationId,
    },
    update,
    {
      returnDocument: 'after',
      runValidators: true,
    },
  )
    .select('+encryptedPhone +encryptedJid')
    .exec();
};

export const findAccountPrivateIdentifiersForInternalUse = async ({
  accountId,
  organizationId,
} = {}) => {
  const account = await findAccountById({
    accountId,
    organizationId,
    includeEncrypted: true,
  });

  if (!account) {
    return null;
  }

  return {
    accountId: account._id,
    organizationId: account.organizationId,
    phone: decryptAccountPhoneFromStorage(account.encryptedPhone),
    jid: decryptAccountJidFromStorage(account.encryptedJid),
  };
};
