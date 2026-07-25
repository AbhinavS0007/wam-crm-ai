import { afterEach, describe, expect, it, vi } from 'vitest';

import { PERMISSIONS } from '../src/constants/permissions.js';
import {
  deliverEvent,
  formatSseEvent,
  registerClient,
  removeClient,
  shouldDeliverToClient,
} from '../src/modules/realtime/realtime.hub.js';

const ORG = '507f1f77bcf86cd799439011';
const OTHER_ORG = '507f1f77bcf86cd799439099';
const USER = '507f1f77bcf86cd799439012';

const registered = [];

const track = (client) => {
  registered.push(client);
  return client;
};

afterEach(() => {
  registered.splice(0).forEach((client) => removeClient(client));
});

const changedEvent = (overrides = {}) => ({
  type: 'conversation.changed',
  organizationId: ORG,
  conversationId: 'c1',
  assignedTo: null,
  reason: 'inbound',
  ...overrides,
});

describe('shouldDeliverToClient', () => {
  it('delivers to a read-all client in the same organization', () => {
    const client = { organizationId: ORG, userId: USER, canReadAll: true };
    expect(shouldDeliverToClient({ event: changedEvent(), client })).toBe(true);
  });

  it('never delivers across organizations', () => {
    const client = { organizationId: OTHER_ORG, userId: USER, canReadAll: true };
    expect(shouldDeliverToClient({ event: changedEvent(), client })).toBe(false);
  });

  it('delivers to an assigned-only client only for its own conversations', () => {
    const client = { organizationId: ORG, userId: USER, canReadAll: false };

    expect(shouldDeliverToClient({ event: changedEvent({ assignedTo: USER }), client })).toBe(true);
    expect(
      shouldDeliverToClient({ event: changedEvent({ assignedTo: 'someone-else' }), client }),
    ).toBe(false);
    expect(shouldDeliverToClient({ event: changedEvent({ assignedTo: null }), client })).toBe(
      false,
    );
  });
});

describe('formatSseEvent', () => {
  it('produces a well-formed SSE frame', () => {
    const frame = formatSseEvent(changedEvent());
    expect(frame).toMatch(/^event: conversation\.changed\ndata: \{.*\}\n\n$/s);
    expect(frame).toContain('"conversationId":"c1"');
  });
});

describe('deliverEvent fan-out', () => {
  it('writes to a matching client and skips a filtered-out one', () => {
    const matching = { write: vi.fn() };
    const filtered = { write: vi.fn() };

    track(
      registerClient({
        res: matching,
        userId: USER,
        organizationId: ORG,
        permissions: [PERMISSIONS.CONVERSATIONS_READ_ALL],
      }),
    );
    track(
      registerClient({
        res: filtered,
        userId: USER,
        organizationId: OTHER_ORG,
        permissions: [PERMISSIONS.CONVERSATIONS_READ_ALL],
      }),
    );

    const delivered = deliverEvent(changedEvent());

    expect(delivered).toBe(1);
    expect(matching.write).toHaveBeenCalledTimes(1);
    expect(matching.write.mock.calls[0][0]).toContain('conversation.changed');
    expect(filtered.write).not.toHaveBeenCalled();
  });

  it('drops a client whose write throws', () => {
    const broken = {
      write: vi.fn(() => {
        throw new Error('socket closed');
      }),
    };

    track(
      registerClient({
        res: broken,
        userId: USER,
        organizationId: ORG,
        permissions: [PERMISSIONS.CONVERSATIONS_READ_ALL],
      }),
    );

    expect(deliverEvent(changedEvent())).toBe(0);
    // A second delivery finds no client (the broken one was removed).
    expect(deliverEvent(changedEvent())).toBe(0);
    expect(broken.write).toHaveBeenCalledTimes(1);
  });
});
