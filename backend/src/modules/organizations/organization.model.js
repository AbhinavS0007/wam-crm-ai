import mongoose from 'mongoose';

import {
  ORGANIZATION_STATUSES,
  ORGANIZATION_STATUS_VALUES,
} from '../../constants/organization-statuses.js';

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },

    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 2,
      maxlength: 120,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },

    status: {
      type: String,
      required: true,
      enum: ORGANIZATION_STATUS_VALUES,
      default: ORGANIZATION_STATUSES.ACTIVE,
    },
  },
  {
    timestamps: true,
  },
);

organizationSchema.index(
  {
    slug: 1,
  },
  {
    unique: true,
  },
);

export const Organization =
  mongoose.models.Organization ?? mongoose.model('Organization', organizationSchema);
