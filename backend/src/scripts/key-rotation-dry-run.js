import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { Contact } from '../modules/contacts/contact.model.js';
import {
  decryptContactEmailFromStorage,
  decryptContactPhoneFromStorage,
  decryptContactProviderJidsFromStorage,
} from '../modules/privacy/protected-pii.service.js';
import { getCurrentKeyVersion } from '../modules/security/encryption-keyring.service.js';
import { WhatsAppAccount } from '../modules/whatsapp-accounts/whatsapp-account.model.js';
import {
  decryptAccountJidFromStorage,
  decryptAccountPhoneFromStorage,
} from '../modules/privacy/protected-pii.service.js';
import { WhatsAppAuthState } from '../modules/whatsapp-auth-states/whatsapp-auth-state.model.js';
import { decryptAuthStatePayloadFromStorage } from '../modules/whatsapp-auth-states/whatsapp-auth-state.repository.js';

const hasEncryptedField = (value) => Boolean(value && typeof value === 'object');

const inspectEncryptedField = ({ encryptedField, currentKeyVersion, decrypt }) => {
  if (!hasEncryptedField(encryptedField)) {
    return {
      present: false,
      needsRotation: false,
      error: false,
    };
  }

  try {
    decrypt(encryptedField);

    return {
      present: true,
      needsRotation: encryptedField.keyVersion !== currentKeyVersion,
      error: false,
    };
  } catch {
    return {
      present: true,
      needsRotation: false,
      error: true,
    };
  }
};

const updateRecordStats = ({ stats, fieldResults }) => {
  const presentResults = fieldResults.filter((result) => result.present);

  if (presentResults.some((result) => result.needsRotation)) {
    stats.recordsNeedingRotation += 1;
  }

  stats.errors += presentResults.filter((result) => result.error).length;
};

const inspectWhatsAppAccounts = async ({ currentKeyVersion, stats }) => {
  const accounts = await WhatsAppAccount.find({})
    .select('+encryptedPhone +encryptedJid')
    .lean()
    .exec();

  stats.whatsappAccountRecordsChecked = accounts.length;

  for (const account of accounts) {
    updateRecordStats({
      stats,
      fieldResults: [
        inspectEncryptedField({
          encryptedField: account.encryptedPhone,
          currentKeyVersion,
          decrypt: decryptAccountPhoneFromStorage,
        }),
        inspectEncryptedField({
          encryptedField: account.encryptedJid,
          currentKeyVersion,
          decrypt: decryptAccountJidFromStorage,
        }),
      ],
    });
  }
};

const inspectContacts = async ({ currentKeyVersion, stats }) => {
  const contacts = await Contact.find({})
    .select('+encryptedPhone +encryptedEmail +encryptedProviderJids')
    .lean()
    .exec();

  stats.contactRecordsChecked = contacts.length;

  for (const contact of contacts) {
    updateRecordStats({
      stats,
      fieldResults: [
        inspectEncryptedField({
          encryptedField: contact.encryptedPhone,
          currentKeyVersion,
          decrypt: decryptContactPhoneFromStorage,
        }),
        inspectEncryptedField({
          encryptedField: contact.encryptedEmail,
          currentKeyVersion,
          decrypt: decryptContactEmailFromStorage,
        }),
        inspectEncryptedField({
          encryptedField: contact.encryptedProviderJids,
          currentKeyVersion,
          decrypt: decryptContactProviderJidsFromStorage,
        }),
      ],
    });
  }
};

const inspectWhatsAppAuthStates = async ({ currentKeyVersion, stats }) => {
  const authStates = await WhatsAppAuthState.find({}).select('+encryptedPayload').lean().exec();

  stats.whatsappAuthStateRecordsChecked = authStates.length;

  for (const authState of authStates) {
    updateRecordStats({
      stats,
      fieldResults: [
        inspectEncryptedField({
          encryptedField: authState.encryptedPayload,
          currentKeyVersion,
          decrypt: (encryptedPayload) =>
            decryptAuthStatePayloadFromStorage({
              namespace: authState.namespace,
              keyId: authState.keyId,
              encryptedPayload,
            }),
        }),
      ],
    });
  }
};

const printSummary = ({ logger, stats }) => {
  logger.log('Encryption rotation dry-run completed.');
  logger.log(`Current key version: ${stats.currentKeyVersion}`);
  logger.log(`WhatsAppAccount records checked: ${stats.whatsappAccountRecordsChecked}`);
  logger.log(`Contact records checked: ${stats.contactRecordsChecked}`);
  logger.log(`WhatsAppAuthState records checked: ${stats.whatsappAuthStateRecordsChecked}`);
  logger.log(`Records needing rotation: ${stats.recordsNeedingRotation}`);
  logger.log(`Errors: ${stats.errors}`);
  logger.log('No writes were performed.');
};

export const runKeyRotationDryRun = async ({ connect = true, logger = console } = {}) => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Encryption rotation dry-run must not run in production.');
  }

  const currentKeyVersion = getCurrentKeyVersion();
  const stats = {
    currentKeyVersion,
    whatsappAccountRecordsChecked: 0,
    contactRecordsChecked: 0,
    whatsappAuthStateRecordsChecked: 0,
    recordsNeedingRotation: 0,
    errors: 0,
    writesPerformed: false,
  };

  if (connect) {
    await connectDatabase();
  }

  try {
    await inspectWhatsAppAccounts({
      currentKeyVersion,
      stats,
    });
    await inspectContacts({
      currentKeyVersion,
      stats,
    });
    await inspectWhatsAppAuthStates({
      currentKeyVersion,
      stats,
    });

    printSummary({
      logger,
      stats,
    });

    return stats;
  } finally {
    if (connect) {
      await disconnectDatabase();
    }
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  runKeyRotationDryRun().catch((error) => {
    console.error('Encryption rotation dry-run failed safely.');
    console.error(error.message);
    process.exitCode = 1;
  });
}
