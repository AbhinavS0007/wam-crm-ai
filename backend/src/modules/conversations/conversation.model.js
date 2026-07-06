import mongoose from 'mongoose';

import {
  CONVERSATION_STAGE_VALUES,
  CONVERSATION_STAGES,
} from '../../constants/conversation-stages.js';
import {
  CONVERSATION_STATUSES,
  CONVERSATION_STATUS_VALUES,
} from '../../constants/conversation-statuses.js';

const conversationSchema = new mongoose.Schema(
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

    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      required: true,
      index: true,
    },

    leadId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      match: /^LEAD-\d{8}-[A-Z0-9]{6}$/,
    },

    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 160,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    assignedTeam: {
      type: String,
      trim: true,
      maxlength: 120,
      default: null,
    },

    lastHandledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    lastHandledAt: {
      type: Date,
      default: null,
    },

    stage: {
      type: String,
      required: true,
      enum: CONVERSATION_STAGE_VALUES,
      default: CONVERSATION_STAGES.NEW,
    },

    tags: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Tag',
        },
      ],
      default: [],
    },

    summary: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },

    unreadCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    lastMessageAt: {
      type: Date,
      default: null,
    },

    lastMessagePreview: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },

    nextFollowUpAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      required: true,
      enum: CONVERSATION_STATUS_VALUES,
      default: CONVERSATION_STATUSES.OPEN,
    },
  },
  {
    timestamps: true,
  },
);

conversationSchema.index(
  {
    organizationId: 1,
    whatsappAccountId: 1,
    contactId: 1,
  },
  {
    unique: true,
  },
);

conversationSchema.index({
  organizationId: 1,
  whatsappAccountId: 1,
  updatedAt: -1,
});

conversationSchema.index({
  organizationId: 1,
  assignedTo: 1,
  updatedAt: -1,
});

conversationSchema.index({
  organizationId: 1,
  stage: 1,
  updatedAt: -1,
});

conversationSchema.index({
  organizationId: 1,
  tags: 1,
  updatedAt: -1,
});

conversationSchema.index({
  organizationId: 1,
  nextFollowUpAt: 1,
});

export const Conversation =
  mongoose.models.Conversation ?? mongoose.model('Conversation', conversationSchema);
