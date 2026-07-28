import mongoose from 'mongoose';

import { STAGE_STATUSES, STAGE_STATUS_VALUES } from '../../constants/stage-statuses.js';

const stageSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 1,
      maxlength: 60,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },

    label: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 60,
    },

    color: {
      type: String,
      trim: true,
      match: /^#[0-9a-fA-F]{6}$/,
      default: null,
    },

    status: {
      type: String,
      required: true,
      enum: STAGE_STATUS_VALUES,
      default: STAGE_STATUSES.ACTIVE,
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

stageSchema.index(
  {
    organizationId: 1,
    key: 1,
  },
  {
    unique: true,
  },
);

stageSchema.index({
  organizationId: 1,
  status: 1,
  label: 1,
});

export const Stage = mongoose.models.Stage ?? mongoose.model('Stage', stageSchema);
