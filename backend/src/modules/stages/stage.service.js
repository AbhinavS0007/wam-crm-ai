import { CONVERSATION_STAGE_VALUES } from '../../constants/conversation-stages.js';
import { STAGE_STATUSES } from '../../constants/stage-statuses.js';
import {
  archiveStage,
  createStage,
  deleteStage,
  findStageByKeyInOrg,
  findStageById,
  findStagesByOrganization,
  normalizeStageKey,
} from './stage.repository.js';
import { serializeStage } from './stage.serializer.js';

export const listStagesForOrganization = async ({ organizationId, status, limit, skip }) => {
  const stages = await findStagesByOrganization({
    organizationId,
    status,
    limit,
    skip,
  });

  return stages.map((stage) => serializeStage(stage));
};

export const createStageForActor = async ({ organizationId, actor, label, key, color }) => {
  const resolvedKey = normalizeStageKey(key ?? label);

  if (CONVERSATION_STAGE_VALUES.includes(resolvedKey)) {
    throw new Error('STAGE_KEY_RESERVED');
  }

  const existing = await findStageByKeyInOrg({
    organizationId,
    key: resolvedKey,
  });

  if (existing) {
    throw new Error('STAGE_KEY_EXISTS');
  }

  const stage = await createStage({
    organizationId,
    key: resolvedKey,
    label,
    color,
    createdBy: actor._id,
  });

  return serializeStage(stage);
};

export const archiveStageForActor = async ({ organizationId, stageId, actor }) => {
  const stage = await findStageById({
    stageId,
    organizationId,
  });

  if (!stage) {
    throw new Error('STAGE_NOT_FOUND');
  }

  const archived = await archiveStage({
    stageId: stage._id,
    organizationId,
    actorId: actor._id,
  });

  return serializeStage(archived);
};

/**
 * Permanently removes a custom stage (not the same as archiving: this drops the row entirely,
 * not just hides it from future selection). Any conversation already sitting on this stage keeps
 * its plain-string value — there's no foreign key to cascade — so it just displays as a raw key
 * with no known label/color from then on (StageBadge already falls back to that gracefully).
 */
export const deleteStageForActor = async ({ organizationId, stageId }) => {
  const deleted = await deleteStage({
    stageId,
    organizationId,
  });

  if (!deleted) {
    throw new Error('STAGE_NOT_FOUND');
  }

  return serializeStage(deleted);
};

/**
 * Every conversation stage value must be either a permanent built-in (the fixed 7-value enum) or
 * an active, org-defined custom stage. Called before a conversation's stage is changed, since the
 * Mongoose schema no longer enforces this at the database layer (custom values can't be a fixed
 * `enum`). Returns the canonical value to store — the built-in as-is, or the custom stage's
 * normalized `key` — so a differently-cased/spaced input still lands on the exact stored key.
 */
export const resolveUsableStageValue = async ({ organizationId, stage }) => {
  if (CONVERSATION_STAGE_VALUES.includes(stage)) {
    return stage;
  }

  const custom = await findStageByKeyInOrg({
    organizationId,
    key: stage,
  });

  if (!custom || custom.status !== STAGE_STATUSES.ACTIVE) {
    throw new Error('INVALID_STAGE');
  }

  return custom.key;
};
