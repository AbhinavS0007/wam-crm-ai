import mongoose from 'mongoose';

import {
  REFRESH_SESSION_STATUSES,
  REFRESH_SESSION_STATUS_VALUES,
} from '../../constants/refresh-session-statuses.js';

const refreshSessionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    familyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    tokenHash: {
      type: String,
      required: true,
      select: false,
    },

    status: {
      type: String,
      required: true,
      enum: REFRESH_SESSION_STATUS_VALUES,
      default: REFRESH_SESSION_STATUSES.ACTIVE,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    lastUsedAt: {
      type: Date,
      default: null,
    },

    rotatedAt: {
      type: Date,
      default: null,
    },

    revokedAt: {
      type: Date,
      default: null,
    },

    revokeReason: {
      type: String,
      trim: true,
      maxlength: 240,
      default: null,
    },

    replacedBySessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RefreshSession',
      default: null,
    },

    createdByIp: {
      type: String,
      trim: true,
      maxlength: 120,
      default: null,
    },

    lastUsedByIp: {
      type: String,
      trim: true,
      maxlength: 120,
      default: null,
    },

    userAgent: {
      type: String,
      trim: true,
      maxlength: 512,
      default: null,
    },

    reuseDetectedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  },
);

refreshSessionSchema.index(
  {
    tokenHash: 1,
  },
  {
    unique: true,
  },
);

refreshSessionSchema.index({
  userId: 1,
  status: 1,
  expiresAt: 1,
});

refreshSessionSchema.index({
  familyId: 1,
});

refreshSessionSchema.index({
  expiresAt: 1,
});

export const RefreshSession =
  mongoose.models.RefreshSession ?? mongoose.model('RefreshSession', refreshSessionSchema);
