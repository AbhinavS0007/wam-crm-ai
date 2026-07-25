import { describe, expect, it, vi } from 'vitest';

import { REALTIME_CHANNEL } from '../src/modules/realtime/realtime.events.js';
import { publishConversationChanged } from '../src/modules/realtime/realtime.publisher.js';

describe('publishConversationChanged', () => {
  it('publishes a stringified, non-PII event to the realtime channel', async () => {
    const publish = vi.fn(async () => 1);
    const redisClient = { isReady: true, publish };

    const result = await publishConversationChanged(
      { organizationId: 'org1', conversationId: 'c1', assignedTo: 'user1', reason: 'inbound' },
      { redisClient },
    );

    expect(result).toBe(true);
    expect(publish).toHaveBeenCalledTimes(1);

    const [channel, payload] = publish.mock.calls[0];
    expect(channel).toBe(REALTIME_CHANNEL);

    const event = JSON.parse(payload);
    expect(event).toEqual({
      type: 'conversation.changed',
      organizationId: 'org1',
      conversationId: 'c1',
      assignedTo: 'user1',
      reason: 'inbound',
    });
    // No message body / phone on the channel.
    expect(payload).not.toMatch(/body|phone|@s\.whatsapp\.net/);
  });

  it('stringifies ObjectId-like ids and tolerates a null assignee', async () => {
    const publish = vi.fn(async () => 1);
    const redisClient = { isReady: true, publish };

    await publishConversationChanged(
      {
        organizationId: { toString: () => 'orgX' },
        conversationId: { toString: () => 'convX' },
        assignedTo: null,
        reason: 'stage',
      },
      { redisClient },
    );

    const event = JSON.parse(publish.mock.calls[0][1]);
    expect(event).toMatchObject({
      organizationId: 'orgX',
      conversationId: 'convX',
      assignedTo: null,
    });
  });

  it('is a no-op when redis is not ready', async () => {
    const publish = vi.fn();
    const result = await publishConversationChanged(
      { organizationId: 'org1', conversationId: 'c1', reason: 'inbound' },
      { redisClient: { isReady: false, publish } },
    );

    expect(result).toBe(false);
    expect(publish).not.toHaveBeenCalled();
  });

  it('swallows a publish error and returns false', async () => {
    const redisClient = {
      isReady: true,
      publish: vi.fn(async () => {
        throw new Error('redis down');
      }),
    };

    await expect(
      publishConversationChanged(
        { organizationId: 'org1', conversationId: 'c1', reason: 'inbound' },
        { redisClient },
      ),
    ).resolves.toBe(false);
  });

  it('returns false without organization or conversation ids', async () => {
    const publish = vi.fn();
    const result = await publishConversationChanged(
      { reason: 'inbound' },
      { redisClient: { isReady: true, publish } },
    );

    expect(result).toBe(false);
    expect(publish).not.toHaveBeenCalled();
  });
});
