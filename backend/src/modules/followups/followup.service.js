import { ACTIVITY_EVENTS } from '../../constants/activity-events.js';
import { FOLLOWUP_STATUSES } from '../../constants/followup-statuses.js';
import { createActivity } from '../activity/activity-log.repository.js';
import { loadVisibleConversationForActor } from '../conversations/conversation.service.js';
import {
  createFollowUpTask,
  findFollowUpTaskById,
  findFollowUpTasksByConversation,
  findPendingTasksByUser,
  updateTaskStatus,
} from './followup-task.repository.js';
import { serializeFollowUpTask } from './followup-task.serializer.js';

export const createFollowUpForActor = async ({
  organizationId,
  conversationId,
  actor,
  permissions,
  assignedTo,
  type,
  note,
  dueAt,
  priority,
}) => {
  const conversation = await loadVisibleConversationForActor({
    organizationId,
    conversationId,
    permissions,
    actorId: actor._id,
  });

  const task = await createFollowUpTask({
    organizationId,
    whatsappAccountId: conversation.whatsappAccountId,
    conversationId: conversation._id,
    assignedTo: assignedTo ?? actor._id,
    createdBy: actor._id,
    type,
    note,
    dueAt,
    priority,
  });

  await createActivity({
    organizationId,
    whatsappAccountId: conversation.whatsappAccountId,
    conversationId: conversation._id,
    actorId: actor._id,
    eventType: ACTIVITY_EVENTS.FOLLOWUP_CREATED,
    summary: 'Follow-up task created.',
    metadata: {
      type,
      priority,
    },
  });

  return serializeFollowUpTask(task);
};

export const listConversationFollowUpsForActor = async ({
  organizationId,
  conversationId,
  actor,
  permissions,
}) => {
  await loadVisibleConversationForActor({
    organizationId,
    conversationId,
    permissions,
    actorId: actor._id,
  });

  const tasks = await findFollowUpTasksByConversation({
    organizationId,
    conversationId,
  });

  return tasks.map((task) => serializeFollowUpTask(task));
};

export const listMyFollowUps = async ({ organizationId, actor, dueBefore, limit, skip }) => {
  const tasks = await findPendingTasksByUser({
    organizationId,
    assignedTo: actor._id,
    dueBefore,
    limit,
    skip,
  });

  return tasks.map((task) => serializeFollowUpTask(task));
};

const transitionTask = async ({ organizationId, taskId, actor, status, eventType, summary }) => {
  const task = await findFollowUpTaskById({
    taskId,
    organizationId,
  });

  if (!task) {
    throw new Error('FOLLOWUP_NOT_FOUND');
  }

  if (task.status !== FOLLOWUP_STATUSES.PENDING) {
    throw new Error('FOLLOWUP_NOT_PENDING');
  }

  const updated = await updateTaskStatus({
    taskId: task._id,
    organizationId,
    status,
  });

  await createActivity({
    organizationId,
    whatsappAccountId: task.whatsappAccountId,
    conversationId: task.conversationId,
    actorId: actor._id,
    eventType,
    summary,
    metadata: {},
  });

  return serializeFollowUpTask(updated);
};

export const completeFollowUpForActor = ({ organizationId, taskId, actor }) =>
  transitionTask({
    organizationId,
    taskId,
    actor,
    status: FOLLOWUP_STATUSES.COMPLETED,
    eventType: ACTIVITY_EVENTS.FOLLOWUP_COMPLETED,
    summary: 'Follow-up task completed.',
  });

export const cancelFollowUpForActor = ({ organizationId, taskId, actor }) =>
  transitionTask({
    organizationId,
    taskId,
    actor,
    status: FOLLOWUP_STATUSES.CANCELLED,
    eventType: ACTIVITY_EVENTS.FOLLOWUP_CANCELLED,
    summary: 'Follow-up task cancelled.',
  });
