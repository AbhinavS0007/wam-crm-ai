import { assertNoSensitiveKeys } from '../security/redaction.service.js';
import { ActivityLog } from './activity-log.model.js';

export const createActivity = (activityData) => {
  assertNoSensitiveKeys(activityData.metadata, {
    label: 'Activity metadata',
  });

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
