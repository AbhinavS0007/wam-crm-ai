import { describe, expect, it, vi } from 'vitest';

import { MESSAGE_STATUSES } from '../src/constants/message-statuses.js';
import { createOutboundDeliveryService } from '../src/modules/whatsapp/delivery/outbound-delivery.service.js';

const createConfig = (overrides = {}) => ({
  WHATSAPP_SEND_TEXT_POC_ENABLED: true,
  WHATSAPP_OUTBOUND_MAX_ATTEMPTS: 3,
  WHATSAPP_MAX_OUTBOUND_PER_MINUTE: 5,
  ...overrides,
});

const createQueuedMessage = (overrides = {}) => ({
  _id: '507f1f77bcf86cd799439100',
  organizationId: '507f1f77bcf86cd799439011',
  whatsappAccountId: '507f1f77bcf86cd799439012',
  contactId: '507f1f77bcf86cd799439013',
  body: 'Hello from the CRM',
  deliveryAttempts: 1,
  ...overrides,
});

const baseContext = {
  organizationId: '507f1f77bcf86cd799439011',
  whatsappAccountId: '507f1f77bcf86cd799439012',
};

describe('Phase 8 outbound delivery service', () => {
  it('delivers a queued message and marks it sent with the provider id', async () => {
    const message = createQueuedMessage();
    const markOutboundMessageSent = vi.fn(async () => ({}));

    const service = createOutboundDeliveryService({
      findConversationById: async () => ({ assignedTo: null }),
      publishEvent: async () => {},
      config: createConfig(),
      sessionService: {
        sendTextMessage: vi.fn(async () => ({ sent: true, providerMessageId: 'wamid-1' })),
      },
      contactRepository: {
        findContactPrivatePiiForInternalUse: vi.fn(async () => ({
          phone: '919876543210',
          providerJids: ['919876543210@s.whatsapp.net'],
        })),
      },
      messageRepository: {
        claimNextOutboundMessage: vi.fn(async () => message),
        markOutboundMessageSent,
        markOutboundMessageFailed: vi.fn(),
      },
    });

    const result = await service.deliverNext(baseContext);

    expect(result.delivered).toBe(true);
    expect(markOutboundMessageSent).toHaveBeenCalledWith(
      expect.objectContaining({
        messageId: message._id,
        organizationId: baseContext.organizationId,
        providerMessageId: 'wamid-1',
      }),
    );
  });

  it('prefers the provider JID as the recipient', async () => {
    const sendTextMessage = vi.fn(async () => ({ providerMessageId: 'wamid-2' }));

    const service = createOutboundDeliveryService({
      findConversationById: async () => ({ assignedTo: null }),
      publishEvent: async () => {},
      config: createConfig(),
      sessionService: { sendTextMessage },
      contactRepository: {
        findContactPrivatePiiForInternalUse: vi.fn(async () => ({
          phone: '919876543210',
          providerJids: ['919876543210@s.whatsapp.net'],
        })),
      },
      messageRepository: {
        claimNextOutboundMessage: vi.fn(async () => createQueuedMessage()),
        markOutboundMessageSent: vi.fn(),
        markOutboundMessageFailed: vi.fn(),
      },
    });

    await service.deliverNext(baseContext);

    expect(sendTextMessage).toHaveBeenCalledWith({
      to: '919876543210@s.whatsapp.net',
      text: 'Hello from the CRM',
    });
  });

  it('marks a message failed_permanent when there is no recipient', async () => {
    const markOutboundMessageFailed = vi.fn(async () => ({}));
    const sendTextMessage = vi.fn();

    const service = createOutboundDeliveryService({
      findConversationById: async () => ({ assignedTo: null }),
      publishEvent: async () => {},
      config: createConfig(),
      sessionService: { sendTextMessage },
      contactRepository: {
        findContactPrivatePiiForInternalUse: vi.fn(async () => ({
          phone: null,
          providerJids: [],
        })),
      },
      messageRepository: {
        claimNextOutboundMessage: vi.fn(async () => createQueuedMessage()),
        markOutboundMessageSent: vi.fn(),
        markOutboundMessageFailed,
      },
    });

    const result = await service.deliverNext(baseContext);

    expect(sendTextMessage).not.toHaveBeenCalled();
    expect(result.permanent).toBe(true);
    expect(markOutboundMessageFailed).toHaveBeenCalledWith(
      expect.objectContaining({ permanent: true, error: 'no_recipient' }),
    );
  });

  it('retries with a backoff when the send throws below the attempt cap', async () => {
    const markOutboundMessageFailed = vi.fn(async () => ({}));

    const service = createOutboundDeliveryService({
      findConversationById: async () => ({ assignedTo: null }),
      publishEvent: async () => {},
      config: createConfig({ WHATSAPP_OUTBOUND_MAX_ATTEMPTS: 3 }),
      now: () => new Date('2026-07-24T12:00:00.000Z'),
      computeBackoffMs: () => 30_000,
      sessionService: {
        sendTextMessage: vi.fn(async () => {
          const error = new Error('Connection Closed');
          error.code = 'CONNECTION_CLOSED';
          throw error;
        }),
      },
      contactRepository: {
        findContactPrivatePiiForInternalUse: vi.fn(async () => ({
          providerJids: ['919876543210@s.whatsapp.net'],
        })),
      },
      messageRepository: {
        claimNextOutboundMessage: vi.fn(async () => createQueuedMessage({ deliveryAttempts: 1 })),
        markOutboundMessageSent: vi.fn(),
        markOutboundMessageFailed,
      },
    });

    const result = await service.deliverNext(baseContext);

    expect(result.failed).toBe(true);
    expect(result.permanent).toBe(false);

    const call = markOutboundMessageFailed.mock.calls[0][0];
    expect(call.permanent).toBe(false);
    expect(call.error).toBe('CONNECTION_CLOSED');
    expect(call.nextAttemptAt).toEqual(new Date('2026-07-24T12:00:30.000Z'));
  });

  it('marks failed_permanent once the attempt cap is reached', async () => {
    const markOutboundMessageFailed = vi.fn(async () => ({}));

    const service = createOutboundDeliveryService({
      findConversationById: async () => ({ assignedTo: null }),
      publishEvent: async () => {},
      config: createConfig({ WHATSAPP_OUTBOUND_MAX_ATTEMPTS: 3 }),
      sessionService: {
        sendTextMessage: vi.fn(async () => {
          throw new Error('boom');
        }),
      },
      contactRepository: {
        findContactPrivatePiiForInternalUse: vi.fn(async () => ({
          providerJids: ['919876543210@s.whatsapp.net'],
        })),
      },
      messageRepository: {
        claimNextOutboundMessage: vi.fn(async () => createQueuedMessage({ deliveryAttempts: 3 })),
        markOutboundMessageSent: vi.fn(),
        markOutboundMessageFailed,
      },
    });

    const result = await service.deliverNext(baseContext);

    expect(result.permanent).toBe(true);
    expect(markOutboundMessageFailed.mock.calls[0][0].permanent).toBe(true);
  });

  it('never stores a phone or JID in the delivery error', async () => {
    const markOutboundMessageFailed = vi.fn(async () => ({}));

    const service = createOutboundDeliveryService({
      findConversationById: async () => ({ assignedTo: null }),
      publishEvent: async () => {},
      config: createConfig(),
      sessionService: {
        sendTextMessage: vi.fn(async () => {
          throw new Error('send to 919876543210@s.whatsapp.net failed');
        }),
      },
      contactRepository: {
        findContactPrivatePiiForInternalUse: vi.fn(async () => ({
          providerJids: ['919876543210@s.whatsapp.net'],
        })),
      },
      messageRepository: {
        claimNextOutboundMessage: vi.fn(async () => createQueuedMessage()),
        markOutboundMessageSent: vi.fn(),
        markOutboundMessageFailed,
      },
    });

    await service.deliverNext(baseContext);

    const storedError = markOutboundMessageFailed.mock.calls[0][0].error;
    expect(storedError).not.toContain('919876543210');
    expect(storedError).not.toContain('@s.whatsapp.net');
  });

  it('does nothing when the queue is empty', async () => {
    const service = createOutboundDeliveryService({
      findConversationById: async () => ({ assignedTo: null }),
      publishEvent: async () => {},
      config: createConfig(),
      sessionService: { sendTextMessage: vi.fn() },
      contactRepository: { findContactPrivatePiiForInternalUse: vi.fn() },
      messageRepository: {
        claimNextOutboundMessage: vi.fn(async () => null),
        markOutboundMessageSent: vi.fn(),
        markOutboundMessageFailed: vi.fn(),
      },
    });

    const result = await service.deliverNext(baseContext);

    expect(result.empty).toBe(true);
  });

  it('does not claim or send when sending is disabled', async () => {
    const claimNextOutboundMessage = vi.fn();

    const service = createOutboundDeliveryService({
      findConversationById: async () => ({ assignedTo: null }),
      publishEvent: async () => {},
      config: createConfig({ WHATSAPP_SEND_TEXT_POC_ENABLED: false }),
      sessionService: { sendTextMessage: vi.fn() },
      contactRepository: { findContactPrivatePiiForInternalUse: vi.fn() },
      messageRepository: {
        claimNextOutboundMessage,
        markOutboundMessageSent: vi.fn(),
        markOutboundMessageFailed: vi.fn(),
      },
    });

    const result = await service.deliverNext(baseContext);

    expect(result.disabled).toBe(true);
    expect(claimNextOutboundMessage).not.toHaveBeenCalled();
  });

  it('drains multiple queued messages up to the per-minute cap', async () => {
    const messages = [
      createQueuedMessage({ _id: '507f1f77bcf86cd799439101' }),
      createQueuedMessage({ _id: '507f1f77bcf86cd799439102' }),
    ];
    let index = 0;

    const service = createOutboundDeliveryService({
      findConversationById: async () => ({ assignedTo: null }),
      publishEvent: async () => {},
      config: createConfig({ WHATSAPP_MAX_OUTBOUND_PER_MINUTE: 5 }),
      sessionService: {
        sendTextMessage: vi.fn(async () => ({ providerMessageId: 'wamid' })),
      },
      contactRepository: {
        findContactPrivatePiiForInternalUse: vi.fn(async () => ({
          providerJids: ['919876543210@s.whatsapp.net'],
        })),
      },
      messageRepository: {
        claimNextOutboundMessage: vi.fn(async () => messages[index++] ?? null),
        markOutboundMessageSent: vi.fn(),
        markOutboundMessageFailed: vi.fn(),
      },
    });

    const result = await service.drainQueue(baseContext);

    expect(result).toEqual({ delivered: 2, failed: 0 });
  });
});
