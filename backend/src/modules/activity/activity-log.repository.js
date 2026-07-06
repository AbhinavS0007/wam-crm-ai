import { ActivityLog } from './activity-log.model.js';

const BLOCKED_METADATA_KEY_PARTS = [
  'password',
  'token',
  'cookie',
  'secret',
  'authstate',
  'phone',
  'jid',
  'encryptedphone',
  'encryptedemail',
  'encryptedjid',
  'providerjid',
  'rawpayload',
];

const assertSafeMetadata = (value, path = []) => {
  if (!value || typeof value !== 'object') {
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();

    if (BLOCKED_METADATA_KEY_PARTS.some((blockedPart) => normalizedKey.includes(blockedPart))) {
      throw new Error(
        `Activity metadata contains blocked sensitive key: ${[...path, key].join('.')}`,
      );
    }

    assertSafeMetadata(nestedValue, [...path, key]);
  }
};

export const createActivity = (activityData) => {
  assertSafeMetadata(activityData.metadata);

  return ActivityLog.create(activityData);
};

export const findActivityForConversation = ({
  organizationId,
  conversationId,
  limit = 50,
  skip = 0,
} = {}) =>
  ActivityLog.find({
    organizationId,
    conversationId,
  })
    .sort({
      createdAt: -1,
    })
    .skip(skip)
    .limit(limit)
    .exec();
