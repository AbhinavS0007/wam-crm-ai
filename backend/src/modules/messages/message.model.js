import mongoose from 'mongoose';

import {
  MESSAGE_DIRECTION_VALUES,
  MESSAGE_DIRECTIONS,
} from '../../constants/message-directions.js';
import { MESSAGE_STATUSES, MESSAGE_STATUS_VALUES } from '../../constants/message-statuses.js';
import { MESSAGE_TYPE_VALUES, MESSAGE_TYPES } from '../../constants/message-types.js';

const messageMediaSchema = new mongoose.Schema(
  {
    mimeType: {
      type: String,
      trim: true,
      maxlength: 160,
      default: null,
    },

    fileName: {
      type: String,
      trim: true,
      maxlength: 255,
      default: null,
    },

    sizeBytes: {
      type: Number,
      min: 0,
      default: null,
    },

    storageStatus: {
      type: String,
      enum: ['not_applicable', 'pending', 'stored', 'failed', 'deleted'],
      default: 'not_applicable',
    },
  },
  {
    _id: false,
  },
);

const messageSchema = new mongoose.Schema(
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

    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      required: true,
      index: true,
    },

    providerMessageId: {
      type: String,
      trim: true,
      maxlength: 255,
      default: null,
    },

    idempotencyKey: {
      type: String,
      trim: true,
      maxlength: 255,
      default: null,
    },

    direction: {
      type: String,
      required: true,
      enum: MESSAGE_DIRECTION_VALUES,
    },

    type: {
      type: String,
      required: true,
      enum: MESSAGE_TYPE_VALUES,
      default: MESSAGE_TYPES.TEXT,
    },

    body: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: null,
    },

    mediaObjectKey: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },

    media: {
      type: messageMediaSchema,
      default: () => ({
        storageStatus: 'not_applicable',
      }),
    },

    sentByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    status: {
      type: String,
      required: true,
      enum: MESSAGE_STATUS_VALUES,
      default: MESSAGE_STATUSES.CREATED,
    },

    sentAt: {
      type: Date,
      default: null,
    },

    receivedAt: {
      type: Date,
      default: null,
    },

    providerTimestamp: {
      type: Date,
      default: null,
    },

    statusUpdatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

messageSchema.index(
  {
    organizationId: 1,
    whatsappAccountId: 1,
    providerMessageId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      providerMessageId: {
        $type: 'string',
      },
    },
  },
);

messageSchema.index({
  organizationId: 1,
  conversationId: 1,
  sentAt: -1,
  _id: -1,
});

messageSchema.index(
  {
    organizationId: 1,
    whatsappAccountId: 1,
    idempotencyKey: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: {
        $type: 'string',
      },
    },
  },
);

messageSchema.index({
  organizationId: 1,
  status: 1,
  createdAt: -1,
});

export const Message = mongoose.models.Message ?? mongoose.model('Message', messageSchema);

export { MESSAGE_DIRECTIONS };
