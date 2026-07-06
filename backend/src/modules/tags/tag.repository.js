import { TAG_STATUSES } from '../../constants/tag-statuses.js';
import { Tag } from './tag.model.js';

export const normalizeTagSlug = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const createTag = (tagData) =>
  Tag.create({
    ...tagData,
    whatsappAccountId: tagData.whatsappAccountId ?? null,
    slug: tagData.slug ? normalizeTagSlug(tagData.slug) : normalizeTagSlug(tagData.name),
  });

export const findTagsByOrganization = ({
  organizationId,
  whatsappAccountId,
  includeGlobal = true,
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

  if (whatsappAccountId) {
    filter.whatsappAccountId = includeGlobal
      ? {
          $in: [null, whatsappAccountId],
        }
      : whatsappAccountId;
  }

  return Tag.find(filter)
    .sort({
      name: 1,
    })
    .skip(skip)
    .limit(limit)
    .exec();
};

export const findTagBySlugInScope = ({ organizationId, whatsappAccountId = null, slug } = {}) =>
  Tag.findOne({
    organizationId,
    whatsappAccountId,
    slug: normalizeTagSlug(slug),
  }).exec();

export const archiveTag = ({ tagId, organizationId, actorId } = {}) =>
  Tag.findOneAndUpdate(
    {
      _id: tagId,
      organizationId,
    },
    {
      $set: {
        status: TAG_STATUSES.ARCHIVED,
        updatedBy: actorId,
      },
    },
    {
      returnDocument: 'after',
      runValidators: true,
    },
  ).exec();
