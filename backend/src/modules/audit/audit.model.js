import mongoose from 'mongoose';

import { AUDIT_EVENT_VALUES } from '../../constants/audit-events.js';
import { AUDIT_OUTCOMES, AUDIT_OUTCOME_VALUES } from '../../constants/audit-outcomes.js';

const BLOCKED_METADATA_KEY_PATTERN =
  /password|passwordHash|accessToken|refreshToken|tokenHash|cookie|authorization|secret|requestBody|body/i;

const containsBlockedMetadataKey = (value) => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some((item) => containsBlockedMetadataKey(item));
  }

  return Object.entries(value).some(([key, nestedValue]) => {
    if (BLOCKED_METADATA_KEY_PATTERN.test(key)) {
      return true;
    }

    return containsBlockedMetadataKey(nestedValue);
  });
};

const auditLogSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    eventType: {
      type: String,
      required: true,
      enum: AUDIT_EVENT_VALUES,
      index: true,
    },

    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RefreshSession',
      default: null,
      index: true,
    },

    outcome: {
      type: String,
      required: true,
      enum: AUDIT_OUTCOME_VALUES,
      default: AUDIT_OUTCOMES.SUCCESS,
    },

    reasonCode: {
      type: String,
      trim: true,
      maxlength: 120,
      default: null,
    },

    requestId: {
      type: String,
      trim: true,
      maxlength: 120,
      default: null,
    },

    ipAddress: {
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

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      validate: {
        validator: (metadata) => !containsBlockedMetadataKey(metadata),
        message: 'Audit metadata contains a blocked sensitive key.',
      },
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  },
);

auditLogSchema.index({
  organizationId: 1,
  createdAt: -1,
});

auditLogSchema.index({
  organizationId: 1,
  eventType: 1,
  createdAt: -1,
});

auditLogSchema.index({
  organizationId: 1,
  actorId: 1,
  createdAt: -1,
});

auditLogSchema.index({
  organizationId: 1,
  targetUserId: 1,
  createdAt: -1,
});

export const AuditLog = mongoose.models.AuditLog ?? mongoose.model('AuditLog', auditLogSchema);

export const AUDIT_METADATA_BLOCKED_KEY_PATTERN = BLOCKED_METADATA_KEY_PATTERN;

export const hasBlockedAuditMetadataKey = containsBlockedMetadataKey;
