import mongoose from 'mongoose';

import { CONTACT_STATUSES, CONTACT_STATUS_VALUES } from '../../constants/contact-statuses.js';
import { encryptedFieldSchema } from '../security/encrypted-field.schema.js';

const contactSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
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

    encryptedPhone: {
      type: encryptedFieldSchema,
      default: null,
      select: false,
    },

    encryptedEmail: {
      type: encryptedFieldSchema,
      default: null,
      select: false,
    },

    encryptedProviderJids: {
      type: encryptedFieldSchema,
      default: null,
      select: false,
    },

    profileName: {
      type: String,
      trim: true,
      maxlength: 160,
      default: null,
    },

    source: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 80,
      default: 'manual',
    },

    status: {
      type: String,
      required: true,
      enum: CONTACT_STATUS_VALUES,
      default: CONTACT_STATUSES.ACTIVE,
    },
  },
  {
    timestamps: true,
  },
);

contactSchema.index(
  {
    organizationId: 1,
    leadId: 1,
  },
  {
    unique: true,
  },
);

contactSchema.index({
  organizationId: 1,
  displayName: 1,
});

export const Contact = mongoose.models.Contact ?? mongoose.model('Contact', contactSchema);
