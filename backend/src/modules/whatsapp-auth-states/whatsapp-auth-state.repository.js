import { decryptJson, encryptJson } from '../security/encryption.service.js';
import { WhatsAppAuthState, WHATSAPP_AUTH_STATE_STATUSES } from './whatsapp-auth-state.model.js';

export const getAuthStatePayloadPurpose = ({ namespace, keyId } = {}) =>
  `wam-crm-ai:v1:whatsappAuthState.encryptedPayload:${namespace}:${keyId}`;

export const encryptAuthStatePayloadForStorage = ({ namespace, keyId, payload } = {}) =>
  encryptJson(payload, getAuthStatePayloadPurpose({ namespace, keyId }));

export const decryptAuthStatePayloadFromStorage = ({ namespace, keyId, encryptedPayload } = {}) =>
  decryptJson(encryptedPayload, getAuthStatePayloadPurpose({ namespace, keyId }));

export const upsertEncryptedAuthState = ({
  organizationId,
  whatsappAccountId,
  namespace,
  keyId,
  payload,
  status = WHATSAPP_AUTH_STATE_STATUSES.ACTIVE,
  now = new Date(),
} = {}) => {
  const encryptedPayload = encryptAuthStatePayloadForStorage({
    namespace,
    keyId,
    payload,
  });

  return WhatsAppAuthState.findOneAndUpdate(
    {
      organizationId,
      whatsappAccountId,
      namespace,
      keyId,
    },
    {
      organizationId,
      whatsappAccountId,
      namespace,
      keyId,
      encryptedPayload,
      status,
      lastWrittenAt: now,
    },
    {
      upsert: true,
      returnDocument: 'after',
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  )
    .select('+encryptedPayload')
    .exec();
};

export const findEncryptedAuthStateForInternalUse = async ({
  organizationId,
  whatsappAccountId,
  namespace,
  keyId,
} = {}) => {
  const authState = await WhatsAppAuthState.findOne({
    organizationId,
    whatsappAccountId,
    namespace,
    keyId,
  })
    .select('+encryptedPayload')
    .exec();

  if (!authState) {
    return null;
  }

  return {
    id: authState._id,
    organizationId: authState.organizationId,
    whatsappAccountId: authState.whatsappAccountId,
    namespace: authState.namespace,
    keyId: authState.keyId,
    status: authState.status,
    lastWrittenAt: authState.lastWrittenAt,
    payload: decryptAuthStatePayloadFromStorage({
      namespace: authState.namespace,
      keyId: authState.keyId,
      encryptedPayload: authState.encryptedPayload,
    }),
  };
};

export const listAuthStateKeysForAccount = ({ organizationId, whatsappAccountId } = {}) =>
  WhatsAppAuthState.find({
    organizationId,
    whatsappAccountId,
  })
    .select('namespace keyId status lastWrittenAt createdAt updatedAt')
    .sort({
      namespace: 1,
      keyId: 1,
    })
    .exec();

export const markAuthStateCorrupt = ({
  organizationId,
  whatsappAccountId,
  namespace,
  keyId,
  now = new Date(),
} = {}) =>
  WhatsAppAuthState.findOneAndUpdate(
    {
      organizationId,
      whatsappAccountId,
      namespace,
      keyId,
    },
    {
      status: WHATSAPP_AUTH_STATE_STATUSES.CORRUPT,
      lastWrittenAt: now,
    },
    {
      returnDocument: 'after',
      runValidators: true,
    },
  ).exec();

export const deleteAuthStateForAccount = ({ organizationId, whatsappAccountId } = {}) =>
  WhatsAppAuthState.deleteMany({
    organizationId,
    whatsappAccountId,
  }).exec();
