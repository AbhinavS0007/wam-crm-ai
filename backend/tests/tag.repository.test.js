import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { TAG_STATUSES } from '../src/constants/tag-statuses.js';
import {
  archiveTag,
  createTag,
  findTagBySlugInScope,
  findTagsByOrganization,
} from '../src/modules/tags/tag.repository.js';
import {
  cleanupPhase3TestData,
  createPhase3Account,
  createPhase3Base,
  createTestRunId,
  initializePhase3Models,
} from './fixtures/phase3-fixtures.js';

const testRunId = createTestRunId();

describe('Phase 3.6 Tag repository', () => {
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

  it('supports global and account-specific tag scopes', async () => {
    const base = await createPhase3Base({ testRunId, suffix: 'tag-scope' });
    const secondAccount = await createPhase3Account({
      organizationId: base.organization._id,
      testRunId,
      suffix: 'tag-second-account',
      ownerUserId: base.user._id,
    });

    const globalTag = await createTag({
      organizationId: base.organization._id,
      name: 'Warm Lead',
      slug: `warm-lead-${testRunId}`,
      color: '#112233',
      createdBy: base.user._id,
    });

    const accountTag = await createTag({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
      name: 'Warm Lead',
      slug: `warm-lead-${testRunId}`,
      createdBy: base.user._id,
    });

    const otherAccountTag = await createTag({
      organizationId: base.organization._id,
      whatsappAccountId: secondAccount._id,
      name: 'Warm Lead',
      slug: `warm-lead-${testRunId}`,
      createdBy: base.user._id,
    });

    expect(globalTag.whatsappAccountId).toBeNull();
    expect(accountTag.whatsappAccountId.toString()).toBe(base.account._id.toString());
    expect(otherAccountTag.whatsappAccountId.toString()).toBe(secondAccount._id.toString());

    await expect(
      createTag({
        organizationId: base.organization._id,
        whatsappAccountId: base.account._id,
        name: 'Duplicate',
        slug: `warm-lead-${testRunId}`,
      }),
    ).rejects.toMatchObject({ code: 11000 });

    const foundGlobal = await findTagBySlugInScope({
      organizationId: base.organization._id,
      slug: `warm-lead-${testRunId}`,
    });

    expect(foundGlobal._id.toString()).toBe(globalTag._id.toString());

    const scopedTags = await findTagsByOrganization({
      organizationId: base.organization._id,
      whatsappAccountId: base.account._id,
    });

    expect(scopedTags.map((tag) => tag._id.toString())).toEqual(
      expect.arrayContaining([globalTag._id.toString(), accountTag._id.toString()]),
    );

    const archived = await archiveTag({
      tagId: globalTag._id,
      organizationId: base.organization._id,
      actorId: base.user._id,
    });

    expect(archived.status).toBe(TAG_STATUSES.ARCHIVED);
  });
});
