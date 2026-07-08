import { EncryptionOperationError } from '../../security/encryption.errors.js';
import {
  deleteAuthStateKey,
  findEncryptedAuthStateForInternalUse,
  markAuthStateCorrupt,
  upsertEncryptedAuthState,
} from '../../whatsapp-auth-states/whatsapp-auth-state.repository.js';
import { WhatsAppProviderError } from '../whatsapp.errors.js';
import {
  deserializeBaileysAuthPayload,
  hydrateBaileysKeyValue,
  serializeBaileysAuthPayload,
  toBaileysCredsStorageKey,
  toBaileysKeyStorageKey,
} from './baileys-auth-state.mapper.js';

const assertAdapterInput = ({ organizationId, whatsappAccountId }) => {
  if (!organizationId) {
    throw new WhatsAppProviderError('organizationId is required for Baileys auth-state adapter.', {
      code: 'BAILEYS_AUTH_STATE_ORGANIZATION_REQUIRED',
    });
  }

  if (!whatsappAccountId) {
    throw new WhatsAppProviderError(
      'whatsappAccountId is required for Baileys auth-state adapter.',
      {
        code: 'BAILEYS_AUTH_STATE_ACCOUNT_REQUIRED',
      },
    );
  }
};

const readPayloadSafely = async ({ organizationId, whatsappAccountId, namespace, keyId }) => {
  try {
    return await findEncryptedAuthStateForInternalUse({
      organizationId,
      whatsappAccountId,
      namespace,
      keyId,
    });
  } catch (error) {
    if (error instanceof EncryptionOperationError) {
      await markAuthStateCorrupt({
        organizationId,
        whatsappAccountId,
        namespace,
        keyId,
      });
    }

    throw error;
  }
};

const readCreds = async ({ organizationId, whatsappAccountId, initAuthCreds }) => {
  const { namespace, keyId } = toBaileysCredsStorageKey();

  const storedCreds = await readPayloadSafely({
    organizationId,
    whatsappAccountId,
    namespace,
    keyId,
  });

  if (storedCreds) {
    return deserializeBaileysAuthPayload(storedCreds.payload);
  }

  if (typeof initAuthCreds !== 'function') {
    throw new WhatsAppProviderError(
      'initAuthCreds must be supplied when no encrypted Baileys creds exist yet.',
      {
        code: 'BAILEYS_AUTH_STATE_INIT_CREDS_REQUIRED',
      },
    );
  }

  return initAuthCreds();
};

export const createEncryptedBaileysAuthState = async ({
  organizationId,
  whatsappAccountId,
  initAuthCreds,
  proto,
} = {}) => {
  assertAdapterInput({
    organizationId,
    whatsappAccountId,
  });

  if (initAuthCreds !== undefined && typeof initAuthCreds !== 'function') {
    throw new WhatsAppProviderError('initAuthCreds must be a function.', {
      code: 'BAILEYS_AUTH_STATE_INIT_CREDS_INVALID',
    });
  }

  const creds = await readCreds({
    organizationId,
    whatsappAccountId,
    initAuthCreds,
  });

  const saveCreds = () => {
    const { namespace, keyId } = toBaileysCredsStorageKey();

    return upsertEncryptedAuthState({
      organizationId,
      whatsappAccountId,
      namespace,
      keyId,
      payload: serializeBaileysAuthPayload(creds),
    });
  };

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const output = {};

          await Promise.all(
            ids.map(async (id) => {
              const { namespace, keyId } = toBaileysKeyStorageKey({
                type,
                id,
              });

              const storedKey = await readPayloadSafely({
                organizationId,
                whatsappAccountId,
                namespace,
                keyId,
              });

              if (!storedKey) {
                return;
              }

              const value = deserializeBaileysAuthPayload(storedKey.payload);

              output[id] = hydrateBaileysKeyValue({
                type,
                value,
                proto,
              });
            }),
          );

          return output;
        },

        set: async (data) => {
          const writes = [];

          for (const [type, keyValues] of Object.entries(data ?? {})) {
            for (const [id, value] of Object.entries(keyValues ?? {})) {
              const { namespace, keyId } = toBaileysKeyStorageKey({
                type,
                id,
              });

              if (value === null || value === undefined) {
                writes.push(
                  deleteAuthStateKey({
                    organizationId,
                    whatsappAccountId,
                    namespace,
                    keyId,
                  }),
                );

                continue;
              }

              writes.push(
                upsertEncryptedAuthState({
                  organizationId,
                  whatsappAccountId,
                  namespace,
                  keyId,
                  payload: serializeBaileysAuthPayload(value),
                }),
              );
            }
          }

          await Promise.all(writes);
        },
      },
    },
    saveCreds,
  };
};
