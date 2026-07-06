import { User } from './user.model.js';

export const normalizeEmail = (email) => email.trim().toLowerCase();

export const createUser = (userData) => User.create(userData);

export const findUserById = ({ userId, includePasswordHash = false } = {}) => {
  let query = User.findById(userId);

  if (includePasswordHash) {
    query = query.select('+passwordHash');
  }

  return query.exec();
};

export const findUserByEmailInOrganization = ({
  organizationId,
  email,
  includePasswordHash = false,
}) => {
  let query = User.findOne({
    organizationId,
    email: normalizeEmail(email),
  });

  if (includePasswordHash) {
    query = query.select('+passwordHash');
  }

  return query.exec();
};

export const listUsersByOrganization = ({ organizationId, role, status, limit = 50, skip = 0 }) => {
  const filter = {
    organizationId,
  };

  if (role) {
    filter.role = role;
  }

  if (status) {
    filter.status = status;
  }

  return User.find(filter)
    .sort({
      createdAt: -1,
    })
    .skip(skip)
    .limit(limit)
    .exec();
};

export const updateUserById = (userId, updateData) =>
  User.findByIdAndUpdate(userId, updateData, {
    returnDocument: 'after',
    runValidators: true,
  }).exec();
