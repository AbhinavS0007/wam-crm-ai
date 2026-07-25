import { ActivityLog } from '../../src/modules/activity/activity-log.model.js';
import { AuditLog } from '../../src/modules/audit/audit.model.js';
import { RefreshSession } from '../../src/modules/auth/refresh-session.model.js';
import { Contact } from '../../src/modules/contacts/contact.model.js';
import { Conversation } from '../../src/modules/conversations/conversation.model.js';
import { FollowUpTask } from '../../src/modules/followups/followup-task.model.js';
import { Message } from '../../src/modules/messages/message.model.js';
import { Note } from '../../src/modules/notes/note.model.js';
import { Organization } from '../../src/modules/organizations/organization.model.js';
import { Tag } from '../../src/modules/tags/tag.model.js';
import { User } from '../../src/modules/users/user.model.js';
import { initializePhase3Models } from './phase3-fixtures.js';

export {
  PHASE7_PASSWORD,
  createContactWithPhone,
  createConversationFor,
  createLoginableUser,
  createPhase7Base,
  createTestRunId,
  loginAs,
} from './phase7-fixtures.js';

export const initializePhase9Models = async () => {
  await initializePhase3Models();
  await Promise.all([RefreshSession.init(), AuditLog.init()]);
};

export const cleanupPhase9TestData = async (testRunId) => {
  const organizations = await Organization.find({
    slug: new RegExp(testRunId),
  })
    .select('_id')
    .exec();

  const organizationIds = organizations.map((organization) => organization._id);

  await Promise.all([
    AuditLog.deleteMany({ userAgent: new RegExp(testRunId) }),
    RefreshSession.deleteMany({ userAgent: new RegExp(testRunId) }),
  ]);

  if (organizationIds.length > 0) {
    const orgFilter = { organizationId: { $in: organizationIds } };

    await Promise.all([
      ActivityLog.deleteMany(orgFilter),
      Note.deleteMany(orgFilter),
      FollowUpTask.deleteMany(orgFilter),
      Tag.deleteMany(orgFilter),
      Message.deleteMany(orgFilter),
      Conversation.deleteMany(orgFilter),
      Contact.deleteMany(orgFilter),
      User.deleteMany(orgFilter),
    ]);

    await Organization.deleteMany({ _id: { $in: organizationIds } });
  }

  await User.deleteMany({ email: new RegExp(testRunId) });
};
