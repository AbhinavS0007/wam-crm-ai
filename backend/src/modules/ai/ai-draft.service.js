import { AI_DRAFT_OUTCOME_VALUES } from '../../constants/ai-draft-outcomes.js';
import { env } from '../../config/env.js';
import { loadVisibleConversationForActor } from '../conversations/conversation.service.js';

import { AiDisabledError, AiProviderError, AiRateLimitedError } from './ai.errors.js';
import { buildReplyDraftContext } from './ai-context.service.js';
import { checkAiDraftRateLimit } from './ai-rate-limit.service.js';
import { createAiDraft, findAiDraftById, updateAiDraftOutcome } from './ai-draft.repository.js';
import { getAiProvider } from './ai-provider.instance.js';
import { serializeAiDraft } from './ai-draft.serializer.js';

export const generateReplyDraftForActor = async ({
  organizationId,
  conversationId,
  permissions,
  actor,
}) => {
  if (!env.AI_ENABLED) {
    throw new AiDisabledError();
  }

  const rateLimit = await checkAiDraftRateLimit({
    userId: actor._id,
    limitPerHour: env.AI_DRAFT_RATE_LIMIT_PER_HOUR,
  });

  if (rateLimit.limited) {
    throw new AiRateLimitedError();
  }

  const conversation = await loadVisibleConversationForActor({
    organizationId,
    conversationId,
    permissions,
    actorId: actor._id,
  });

  const { systemPrompt, threadText, contextMessageCount } = await buildReplyDraftContext({
    organizationId,
    conversation,
    contextMessageCount: env.AI_DRAFT_CONTEXT_MESSAGE_COUNT,
  });

  const provider = getAiProvider();
  const { draftText } = await provider.generateReplyDraft({ systemPrompt, threadText });

  if (!draftText) {
    throw new AiProviderError('AI provider returned an empty draft.');
  }

  const draft = await createAiDraft({
    organizationId,
    conversationId: conversation._id,
    contactId: conversation.contactId,
    requestedBy: actor._id,
    draftText,
    contextMessageCount,
  });

  return serializeAiDraft(draft);
};

export const recordDraftOutcomeForActor = async ({
  organizationId,
  conversationId,
  draftId,
  outcome,
}) => {
  if (!AI_DRAFT_OUTCOME_VALUES.includes(outcome)) {
    throw new Error('AI_DRAFT_INVALID_OUTCOME');
  }

  const draft = await findAiDraftById({ draftId, organizationId });

  if (!draft || draft.conversationId.toString() !== conversationId) {
    throw new Error('AI_DRAFT_NOT_FOUND');
  }

  const updated = await updateAiDraftOutcome({ draftId, organizationId, outcome });

  return serializeAiDraft(updated);
};
