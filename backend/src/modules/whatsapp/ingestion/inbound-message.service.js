import { CONVERSATION_STAGES } from '../../../constants/conversation-stages.js';
import { findOrCreateContactByProviderKey as defaultFindOrCreateContactByProviderKey } from '../../contacts/contact.repository.js';
import {
  updateConversationPreview as defaultUpdateConversationPreview,
  upsertConversationForContact as defaultUpsertConversationForContact,
} from '../../conversations/conversation.repository.js';
import { createInboundMessage as defaultCreateInboundMessage } from '../../messages/message.repository.js';
import {
  computeContactProviderKey as defaultComputeContactProviderKey,
  extractPhoneFromJid as defaultExtractPhoneFromJid,
  normalizeProviderJid as defaultNormalizeProviderJid,
} from '../../privacy/protected-pii.service.js';
import { REALTIME_REASONS } from '../../realtime/realtime.events.js';
import { publishConversationChanged as defaultPublishConversationChanged } from '../../realtime/realtime.publisher.js';
import { WhatsAppProviderError } from '../whatsapp.errors.js';

const MESSAGE_BODY_MAX_LENGTH = 5000;
const CONVERSATION_PREVIEW_MAX_LENGTH = 500;
const DISPLAY_NAME_MAX_LENGTH = 160;
const DEFAULT_DISPLAY_NAME = 'WhatsApp Lead';

const INBOUND_EVENT_TYPE = 'message.received';

const truncate = (value, maxLength) =>
  typeof value === 'string' && value.length > maxLength ? value.slice(0, maxLength) : value;

const resolveDisplayName = (pushName) => {
  const normalizedPushName = typeof pushName === 'string' ? pushName.trim() : '';

  if (normalizedPushName === '') {
    return DEFAULT_DISPLAY_NAME;
  }

  return truncate(normalizedPushName, DISPLAY_NAME_MAX_LENGTH);
};

const resolveProfileName = (pushName) => {
  const normalizedPushName = typeof pushName === 'string' ? pushName.trim() : '';

  return normalizedPushName === '' ? null : truncate(normalizedPushName, DISPLAY_NAME_MAX_LENGTH);
};

/**
 * Baileys timestamps arrive as seconds (number or Long). Convert to a Date, or
 * null when unusable.
 */
const resolveProviderTimestamp = (timestamp) => {
  if (timestamp === null || timestamp === undefined) {
    return null;
  }

  const seconds = Number(timestamp);

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  return new Date(seconds * 1000);
};

const isDuplicateKeyError = (error) => error?.code === 11000;

/**
 * Persists inbound WhatsApp messages into the CRM (Contact -> Conversation ->
 * Message). Contact identity is resolved through a deterministic blind index so
 * returning senders reuse the same contact and conversation. Duplicate provider
 * messages are idempotent: they do not double-count unread or bump the preview.
 */
export const createInboundMessageIngestionService = ({
  contactRepository = {
    findOrCreateContactByProviderKey: defaultFindOrCreateContactByProviderKey,
  },
  conversationRepository = {
    upsertConversationForContact: defaultUpsertConversationForContact,
    updateConversationPreview: defaultUpdateConversationPreview,
  },
  messageRepository = {
    createInboundMessage: defaultCreateInboundMessage,
  },
  computeContactProviderKey = defaultComputeContactProviderKey,
  extractPhoneFromJid = defaultExtractPhoneFromJid,
  normalizeProviderJid = defaultNormalizeProviderJid,
  publishEvent = defaultPublishConversationChanged,
  now = () => new Date(),
} = {}) => {
  const ingestInboundMessage = async ({
    organizationId,
    whatsappAccountId,
    inboundMessage,
  } = {}) => {
    if (!inboundMessage || inboundMessage.eventType !== INBOUND_EVENT_TYPE) {
      return {
        persisted: false,
        ignored: true,
      };
    }

    if (!organizationId || !whatsappAccountId) {
      throw new WhatsAppProviderError('Inbound ingestion requires organization and account ids.', {
        code: 'WHATSAPP_INGESTION_CONTEXT_REQUIRED',
      });
    }

    const senderJid = inboundMessage.senderJid ?? inboundMessage.remoteJid;
    const providerContactKey = computeContactProviderKey(senderJid);

    if (!providerContactKey) {
      throw new WhatsAppProviderError('Inbound message is missing a usable sender JID.', {
        code: 'WHATSAPP_INGESTION_SENDER_MISSING',
      });
    }

    const normalizedJid = normalizeProviderJid(senderJid);
    const phone = extractPhoneFromJid(senderJid);

    const { contact } = await contactRepository.findOrCreateContactByProviderKey({
      organizationId,
      providerContactKey,
      displayName: resolveDisplayName(inboundMessage.pushName),
      profileName: resolveProfileName(inboundMessage.pushName),
      phone,
      providerJids: normalizedJid ? [normalizedJid] : [],
      source: 'whatsapp',
    });

    const conversation = await conversationRepository.upsertConversationForContact({
      organizationId,
      whatsappAccountId,
      contactId: contact._id,
      leadId: contact.leadId,
      displayName: contact.displayName,
      defaults: {
        stage: CONVERSATION_STAGES.NEW,
      },
    });

    const receivedAt = now();
    const providerTimestamp = resolveProviderTimestamp(inboundMessage.timestamp);
    const body = truncate(inboundMessage.text ?? '', MESSAGE_BODY_MAX_LENGTH);

    let message;

    try {
      message = await messageRepository.createInboundMessage({
        organizationId,
        whatsappAccountId,
        conversationId: conversation._id,
        contactId: contact._id,
        providerMessageId: inboundMessage.messageId ?? null,
        body,
        receivedAt,
        providerTimestamp,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        return {
          persisted: false,
          duplicate: true,
          contactId: contact._id.toString(),
          conversationId: conversation._id.toString(),
          leadId: conversation.leadId,
        };
      }

      throw error;
    }

    await conversationRepository.updateConversationPreview({
      conversationId: conversation._id,
      organizationId,
      lastMessageAt: message.sentAt ?? receivedAt,
      lastMessagePreview: truncate(body, CONVERSATION_PREVIEW_MAX_LENGTH),
      unreadCountIncrement: 1,
    });

    await publishEvent({
      organizationId,
      conversationId: conversation._id,
      assignedTo: conversation.assignedTo,
      reason: REALTIME_REASONS.INBOUND,
    });

    return {
      persisted: true,
      duplicate: false,
      contactId: contact._id.toString(),
      conversationId: conversation._id.toString(),
      leadId: conversation.leadId,
      messageId: message._id.toString(),
    };
  };

  return {
    ingestInboundMessage,
  };
};
