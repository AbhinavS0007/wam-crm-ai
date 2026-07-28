import { STAGE_STATUSES } from '../../constants/stage-statuses.js';
import { Stage } from './stage.model.js';

export const normalizeStageKey = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const createStage = (stageData) =>
  Stage.create({
    ...stageData,
    key: stageData.key ? normalizeStageKey(stageData.key) : normalizeStageKey(stageData.label),
  });

export const findStagesByOrganization = ({
  organizationId,
  status,
  limit = 100,
  skip = 0,
} = {}) => {
  const filter = {
    organizationId,
  };

  if (status) {
    filter.status = status;
  }

  return Stage.find(filter)
    .sort({
      label: 1,
    })
    .skip(skip)
    .limit(limit)
    .exec();
};

export const findStageByKeyInOrg = ({ organizationId, key } = {}) =>
  Stage.findOne({
    organizationId,
    key: normalizeStageKey(key),
  }).exec();

export const findStageById = ({ stageId, organizationId } = {}) =>
  Stage.findOne({
    _id: stageId,
    organizationId,
  }).exec();

export const deleteStage = ({ stageId, organizationId } = {}) =>
  Stage.findOneAndDelete({
    _id: stageId,
    organizationId,
  }).exec();

export const archiveStage = ({ stageId, organizationId, actorId } = {}) =>
  Stage.findOneAndUpdate(
    {
      _id: stageId,
      organizationId,
    },
    {
      $set: {
        status: STAGE_STATUSES.ARCHIVED,
        updatedBy: actorId,
      },
    },
    {
      returnDocument: 'after',
      runValidators: true,
    },
  ).exec();
