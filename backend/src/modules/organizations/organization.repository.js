import { Organization } from './organization.model.js';

export const createOrganization = (organizationData) => Organization.create(organizationData);

export const findOrganizationById = (organizationId) =>
  Organization.findById(organizationId).exec();

export const findOrganizationBySlug = (slug) =>
  Organization.findOne({
    slug,
  }).exec();

export const listOrganizations = ({ status, limit = 50, skip = 0 } = {}) => {
  const filter = {};

  if (status) {
    filter.status = status;
  }

  return Organization.find(filter)
    .sort({
      createdAt: -1,
    })
    .skip(skip)
    .limit(limit)
    .exec();
};

export const updateOrganizationById = (organizationId, updateData) =>
  Organization.findByIdAndUpdate(organizationId, updateData, {
    returnDocument: 'after',
    runValidators: true,
  }).exec();
