import mongoose from 'mongoose';

import { NOTE_VISIBILITY, NOTE_VISIBILITY_VALUES } from '../../constants/note-visibility.js';

const noteSchema = new mongoose.Schema(
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

    body: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 5000,
    },

    visibility: {
      type: String,
      required: true,
      enum: NOTE_VISIBILITY_VALUES,
      default: NOTE_VISIBILITY.SHARED,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

noteSchema.index({
  organizationId: 1,
  conversationId: 1,
  createdAt: -1,
});

noteSchema.index({
  organizationId: 1,
  visibility: 1,
  createdAt: -1,
});

export const Note = mongoose.models.Note ?? mongoose.model('Note', noteSchema);
