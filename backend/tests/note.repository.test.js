import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { NOTE_VISIBILITY } from '../src/constants/note-visibility.js';
import { ROLES } from '../src/constants/roles.js';
import {
  createNote,
  findNotesForConversationByVisibility,
  softDeleteNote,
} from '../src/modules/notes/note.repository.js';
import {
  cleanupPhase3TestData,
  createPhase3Base,
  createTestRunId,
  initializePhase3Models,
} from './fixtures/phase3-fixtures.js';

const testRunId = createTestRunId();

describe('Phase 3.6 Note repository', () => {
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

  it('enforces note visibility by role and supports soft delete', async () => {
    const base = await createPhase3Base({ testRunId, suffix: 'note-visibility' });

    const sharedNote = await createNote({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      conversationId: base.conversation._id,
      body: 'Shared note',
      visibility: NOTE_VISIBILITY.SHARED,
      createdBy: base.user._id,
    });

    await createNote({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      conversationId: base.conversation._id,
      body: 'Manager note',
      visibility: NOTE_VISIBILITY.MANAGER,
      createdBy: base.user._id,
    });

    await createNote({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      conversationId: base.conversation._id,
      body: 'Admin note',
      visibility: NOTE_VISIBILITY.ADMIN,
      createdBy: base.user._id,
    });

    const staffNotes = await findNotesForConversationByVisibility({
      organizationId: base.organization._id,
      conversationId: base.conversation._id,
      role: ROLES.STAFF,
    });

    expect(staffNotes.map((note) => note.body)).toEqual(['Shared note']);

    const managerNotes = await findNotesForConversationByVisibility({
      organizationId: base.organization._id,
      conversationId: base.conversation._id,
      role: ROLES.MANAGER,
    });

    expect(managerNotes.map((note) => note.body)).toEqual(
      expect.arrayContaining(['Shared note', 'Manager note']),
    );
    expect(managerNotes.map((note) => note.body)).not.toContain('Admin note');

    const adminNotes = await findNotesForConversationByVisibility({
      organizationId: base.organization._id,
      conversationId: base.conversation._id,
      role: ROLES.ADMIN,
    });

    expect(adminNotes).toHaveLength(3);

    await softDeleteNote({
      noteId: sharedNote._id,
      organizationId: base.organization._id,
      actorId: base.user._id,
      now: new Date('2026-07-06T10:00:00.000Z'),
    });

    const staffNotesAfterDelete = await findNotesForConversationByVisibility({
      organizationId: base.organization._id,
      conversationId: base.conversation._id,
      role: ROLES.STAFF,
    });

    expect(staffNotesAfterDelete).toHaveLength(0);
  });
});
