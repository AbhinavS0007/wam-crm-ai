import { z } from 'zod';

import { CONVERSATION_STAGE_VALUES } from '../../constants/conversation-stages.js';
import { CONVERSATION_STATUS_VALUES } from '../../constants/conversation-statuses.js';

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i);

export const listConversationsQuerySchema = z.object({
  whatsappAccountId: objectIdSchema.optional(),
  stage: z.enum(CONVERSATION_STAGE_VALUES).optional(),
  status: z.enum(CONVERSATION_STATUS_VALUES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  skip: z.coerce.number().int().min(0).default(0),
});

export const conversationIdParamsSchema = z.object({
  conversationId: objectIdSchema,
});

export const conversationMessagesQuerySchema = z.object({
  beforeSentAt: z.coerce.date().optional(),
  beforeId: objectIdSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const assignConversationBodySchema = z
  .object({
    assignedTo: objectIdSchema.nullable().optional(),
    assignedTeam: z.string().trim().min(1).max(120).nullable().optional(),
  })
  .refine((body) => body.assignedTo !== undefined || body.assignedTeam !== undefined, {
    message: 'assignedTo or assignedTeam is required.',
  });

export const sendMessageBodySchema = z.object({
  body: z.string().trim().min(1).max(5000),
  idempotencyKey: z.string().trim().min(8).max(255),
});

export const changeStageBodySchema = z.object({
  stage: z.enum(CONVERSATION_STAGE_VALUES),
});

export const conversationActivityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  skip: z.coerce.number().int().min(0).default(0),
});
