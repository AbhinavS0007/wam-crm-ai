import mongoose from 'mongoose';

import {
  ACCOUNT_ACCESS_MODES,
  ACCOUNT_ACCESS_MODE_VALUES,
} from '../../constants/account-access-modes.js';
import { PERMISSION_VALUES } from '../../constants/permissions.js';
import { ROLE_VALUES, ROLES } from '../../constants/roles.js';
import { USER_STATUSES, USER_STATUS_VALUES } from '../../constants/user-statuses.js';

const permissionOverridesSchema = new mongoose.Schema(
  {
    allow: {
      type: [
        {
          type: String,
          enum: PERMISSION_VALUES,
        },
      ],
      default: [],
    },

    deny: {
      type: [
        {
          type: String,
          enum: PERMISSION_VALUES,
        },
      ],
      default: [],
    },
  },
  {
    _id: false,
  },
);

const userSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 320,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      required: true,
      enum: ROLE_VALUES,
      default: ROLES.STAFF,
    },

    permissionOverrides: {
      type: permissionOverridesSchema,
      default: () => ({
        allow: [],
        deny: [],
      }),
    },

    accountAccessMode: {
      type: String,
      required: true,
      enum: ACCOUNT_ACCESS_MODE_VALUES,
      default: ACCOUNT_ACCESS_MODES.SELECTED,
    },

    accountAccess: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
        },
      ],
      default: [],
    },

    status: {
      type: String,
      required: true,
      enum: USER_STATUS_VALUES,
      default: USER_STATUSES.ACTIVE,
    },

    mustChangePassword: {
      type: Boolean,
      required: true,
      default: true,
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index(
  {
    organizationId: 1,
    email: 1,
  },
  {
    unique: true,
  },
);

userSchema.index({
  organizationId: 1,
  role: 1,
  status: 1,
});

export const User = mongoose.models.User ?? mongoose.model('User', userSchema);
