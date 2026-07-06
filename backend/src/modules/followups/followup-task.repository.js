import { FOLLOWUP_STATUSES } from '../../constants/followup-statuses.js';
import { FollowUpTask } from './followup-task.model.js';

export const createFollowUpTask = (taskData) => FollowUpTask.create(taskData);

export const findPendingTasksByUser = ({
  organizationId,
  assignedTo,
  dueBefore,
  limit = 50,
  skip = 0,
} = {}) => {
  const filter = {
    organizationId,
    assignedTo,
    status: FOLLOWUP_STATUSES.PENDING,
  };

  if (dueBefore) {
    filter.dueAt = {
      $lte: dueBefore,
    };
  }

  return FollowUpTask.find(filter)
    .sort({
      dueAt: 1,
    })
    .skip(skip)
    .limit(limit)
    .exec();
};

export const findDuePendingTasks = ({ organizationId, dueAt = new Date(), limit = 100 } = {}) =>
  FollowUpTask.find({
    organizationId,
    status: FOLLOWUP_STATUSES.PENDING,
    dueAt: {
      $lte: dueAt,
    },
  })
    .sort({
      dueAt: 1,
    })
    .limit(limit)
    .exec();

export const updateTaskStatus = ({
  taskId,
  organizationId,
  status,
  now = new Date(),
  queueJobId,
  lastNotificationAt,
} = {}) => {
  const updateData = {
    status,
  };

  if (status === FOLLOWUP_STATUSES.COMPLETED) {
    updateData.completedAt = now;
  }

  if (status === FOLLOWUP_STATUSES.CANCELLED) {
    updateData.cancelledAt = now;
  }

  if (status === FOLLOWUP_STATUSES.MISSED) {
    updateData.missedAt = now;
  }

  if (queueJobId !== undefined) {
    updateData.queueJobId = queueJobId;
  }

  if (lastNotificationAt !== undefined) {
    updateData.lastNotificationAt = lastNotificationAt;
  }

  return FollowUpTask.findOneAndUpdate(
    {
      _id: taskId,
      organizationId,
    },
    {
      $set: updateData,
    },
    {
      returnDocument: 'after',
      runValidators: true,
    },
  ).exec();
};
