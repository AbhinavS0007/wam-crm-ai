import mongoose from 'mongoose';

import { ACTIVITY_EVENT_VALUES } from '../../constants/activity-events.js';

const activityLogSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    whatsappAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WhatsAppAccount',
      required: true,
      index: true,
    },

    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },

    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    eventType: {
      type: String,
      required: true,
      enum: ACTIVITY_EVENT_VALUES,
    },

    summary: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 500,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  },
);

activityLogSchema.index({
  organizationId: 1,
  conversationId: 1,
  createdAt: -1,
});

activityLogSchema.index({
  organizationId: 1,
  whatsappAccountId: 1,
  createdAt: -1,
});

activityLogSchema.index({
  organizationId: 1,
  actorId: 1,
  createdAt: -1,
});

export const ActivityLog =
  mongoose.models.ActivityLog ?? mongoose.model('ActivityLog', activityLogSchema);
