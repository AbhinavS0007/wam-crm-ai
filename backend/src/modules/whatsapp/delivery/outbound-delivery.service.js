import { env } from '../../../config/env.js';
import { findContactPrivatePiiForInternalUse as defaultFindContactPrivatePiiForInternalUse } from '../../contacts/contact.repository.js';
import { findConversationById as defaultFindConversationById } from '../../conversations/conversation.repository.js';
import {
  claimNextOutboundMessage as defaultClaimNextOutboundMessage,
  markOutboundMessageFailed as defaultMarkOutboundMessageFailed,
  markOutboundMessageSent as defaultMarkOutboundMessageSent,
} from '../../messages/message.repository.js';
import { REALTIME_REASONS } from '../../realtime/realtime.events.js';
import { publishConversationChanged as defaultPublishConversationChanged } from '../../realtime/realtime.publisher.js';

const BASE_BACKOFF_MS = 30_000;
const MAX_BACKOFF_MS = 15 * 60_000;

const asBoolean = (value) => value === true || value === 'true';

const defaultComputeBackoffMs = (attempts) =>
  Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1));

/**
 * Keeps a safe, non-PII string for the stored delivery error. Provider error messages
 * can echo recipient identifiers, so only the code/name is retained.
 */
const sanitizeDeliveryError = (error) => error?.code ?? error?.name ?? 'send_failed';

const resolveRecipient = (privatePii) => {
  const providerJid = privatePii?.providerJids?.find(
    (jid) => typeof jid === 'string' && jid.trim() !== '',
  );

  if (providerJid) {
    return providerJid;
  }

  const phone = privatePii?.phone;

  return typeof phone === 'string' && phone.trim() !== '' ? phone.trim() : null;
};

/**
 * Drains queued outbound messages and delivers them through the running WhatsApp session.
 *
 * A message is claimed atomically (status -> sending) before sending so overlapping ticks
 * never double-send. On success the row becomes `sent` with the provider message id; on
 * failure it becomes `failed` with a backoff `nextAttemptAt`, or `failed_permanent` once
 * the attempt cap is reached.
 */
export const createOutboundDeliveryService = ({
  sessionService,
  config = env,
  contactRepository = {
    findContactPrivatePiiForInternalUse: defaultFindContactPrivatePiiForInternalUse,
  },
  messageRepository = {
    claimNextOutboundMessage: defaultClaimNextOutboundMessage,
    markOutboundMessageSent: defaultMarkOutboundMessageSent,
    markOutboundMessageFailed: defaultMarkOutboundMessageFailed,
  },
  findConversationById = defaultFindConversationById,
  publishEvent = defaultPublishConversationChanged,
  computeBackoffMs = defaultComputeBackoffMs,
  now = () => new Date(),
  logger = console,
} = {}) => {
  const maxAttempts = Number(config.WHATSAPP_OUTBOUND_MAX_ATTEMPTS ?? 3);
  const maxPerMinute = Number(config.WHATSAPP_MAX_OUTBOUND_PER_MINUTE ?? 5);
  const sendEnabled = asBoolean(config.WHATSAPP_SEND_TEXT_POC_ENABLED);

  const publishStatusChange = async ({ organizationId, message }) => {
    const conversation = await findConversationById({
      conversationId: message.conversationId,
      organizationId,
    });

    await publishEvent({
      organizationId,
      conversationId: message.conversationId,
      assignedTo: conversation?.assignedTo ?? null,
      reason: REALTIME_REASONS.STATUS,
    });
  };

  const deliverNext = async ({ organizationId, whatsappAccountId } = {}) => {
    if (!sendEnabled) {
      return {
        delivered: false,
        disabled: true,
      };
    }

    const message = await messageRepository.claimNextOutboundMessage({
      organizationId,
      whatsappAccountId,
      now: now(),
      maxAttempts,
    });

    if (!message) {
      return {
        delivered: false,
        empty: true,
      };
    }

    const privatePii = await contactRepository.findContactPrivatePiiForInternalUse({
      contactId: message.contactId,
      organizationId,
    });

    const recipient = resolveRecipient(privatePii);

    if (!recipient) {
      await messageRepository.markOutboundMessageFailed({
        messageId: message._id,
        organizationId,
        error: 'no_recipient',
        permanent: true,
        now: now(),
      });

      await publishStatusChange({ organizationId, message });

      return {
        delivered: false,
        failed: true,
        permanent: true,
        reason: 'no_recipient',
      };
    }

    try {
      const result = await sessionService.sendTextMessage({
        to: recipient,
        text: message.body,
      });

      await messageRepository.markOutboundMessageSent({
        messageId: message._id,
        organizationId,
        providerMessageId: result?.providerMessageId ?? null,
        now: now(),
      });

      await publishStatusChange({ organizationId, message });

      return {
        delivered: true,
        messageId: message._id.toString(),
      };
    } catch (error) {
      const permanent = message.deliveryAttempts >= maxAttempts;
      const nextAttemptAt = permanent
        ? null
        : new Date(now().getTime() + computeBackoffMs(message.deliveryAttempts));

      logger?.error?.('Outbound delivery attempt failed safely.', {
        code: error?.code,
        name: error?.name,
        permanent,
      });

      await messageRepository.markOutboundMessageFailed({
        messageId: message._id,
        organizationId,
        error: sanitizeDeliveryError(error),
        permanent,
        nextAttemptAt,
        now: now(),
      });

      await publishStatusChange({ organizationId, message });

      return {
        delivered: false,
        failed: true,
        permanent,
      };
    }
  };

  const drainQueue = async ({ organizationId, whatsappAccountId, max = maxPerMinute } = {}) => {
    let delivered = 0;
    let failed = 0;

    for (let processed = 0; processed < max; processed += 1) {
      const result = await deliverNext({
        organizationId,
        whatsappAccountId,
      });

      if (result.empty || result.disabled) {
        break;
      }

      if (result.delivered) {
        delivered += 1;
      } else if (result.failed) {
        failed += 1;
      }
    }

    return {
      delivered,
      failed,
    };
  };

  return {
    deliverNext,
    drainQueue,
  };
};
