import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { FOLLOWUP_STATUSES } from '../src/constants/followup-statuses.js';
import {
  createFollowUpTask,
  findDuePendingTasks,
  findPendingTasksByUser,
  updateTaskStatus,
} from '../src/modules/followups/followup-task.repository.js';
import {
  cleanupPhase3TestData,
  createPhase3Base,
  createPhase3FollowUpData,
  createTestRunId,
  initializePhase3Models,
} from './fixtures/phase3-fixtures.js';

const testRunId = createTestRunId();

describe('Phase 3.6 FollowUpTask repository', () => {
  beforeAll(async () => {
    await connectDatabase();
    await initializePhase3Models();
  });

  afterAll(async () => {
    try {
      await cleanupPhase3TestData(testRunId);
    } finally {
      await disconnectDatabase();
    }
  });

  it('creates, finds due pending tasks and updates task status', async () => {
    const base = await createPhase3Base({ testRunId, suffix: 'followup-main' });
    const dueAt = new Date('2026-07-06T10:00:00.000Z');

    const task = await createFollowUpTask(createPhase3FollowUpData({ base, dueAt }));

    const userTasks = await findPendingTasksByUser({
      organizationId: base.organization._id,
      assignedTo: base.user._id,
      dueBefore: new Date('2026-07-06T10:30:00.000Z'),
    });

    expect(userTasks.map((item) => item._id.toString())).toContain(task._id.toString());

    const dueTasks = await findDuePendingTasks({
      organizationId: base.organization._id,
      dueAt: new Date('2026-07-06T10:30:00.000Z'),
    });

    expect(dueTasks.map((item) => item._id.toString())).toContain(task._id.toString());

    const completed = await updateTaskStatus({
      taskId: task._id,
      organizationId: base.organization._id,
      status: FOLLOWUP_STATUSES.COMPLETED,
      now: new Date('2026-07-06T10:15:00.000Z'),
    });

    expect(completed.status).toBe(FOLLOWUP_STATUSES.COMPLETED);
    expect(completed.completedAt).toBeInstanceOf(Date);
  });
});
