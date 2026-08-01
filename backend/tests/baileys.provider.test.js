import { describe, expect, it, vi } from 'vitest';

import {
  createBaileysProvider,
  normalizeBaileysInboundMessage,
} from '../src/modules/whatsapp/providers/baileys.provider.js';

const createProviderTestHarness = ({ socketOverrides = {} } = {}) => {
  const eventHandlers = {};
  const fakeSocket = {
    ev: {
      on: vi.fn((eventName, handler) => {
        eventHandlers[eventName] = handler;
      }),
    },
    sendMessage: vi.fn(async () => ({
      key: {
        id: 'provider-message-id',
      },
    })),
    end: vi.fn(),
    ws: {
      close: vi.fn(),
    },
    ...socketOverrides,
  };

  const makeWASocket = vi.fn(() => fakeSocket);
  const saveCreds = vi.fn();
  const renderQr = vi.fn();

  const provider = createBaileysProvider({
    renderQr,
    loadPackage: async () => ({
      makeWASocket,
      initAuthCreds: vi.fn(),
      proto: {
        Message: {},
      },
    }),
    createAuthState: vi.fn(async () => ({
      state: {
        creds: {
          registrationId: 1,
        },
        keys: {
          get: vi.fn(),
          set: vi.fn(),
        },
      },
      saveCreds,
    })),
    logger: {
      error: vi.fn(),
    },
  });

  return {
    eventHandlers,
    fakeSocket,
    makeWASocket,
    provider,
    renderQr,
    saveCreds,
  };
};

describe('Baileys provider runtime boundary', () => {
  it('creates a socket using injected Baileys package and encrypted auth-state adapter', async () => {
    const { eventHandlers, fakeSocket, makeWASocket, provider, renderQr, saveCreds } =
      createProviderTestHarness();

    const onQr = vi.fn();
    const onConnectionUpdate = vi.fn();

    const session = await provider.createSession({
      organizationId: '507f1f77bcf86cd799439011',
      whatsappAccountId: '507f1f77bcf86cd799439012',
      qrOutput: 'terminal',
      onQr,
      onConnectionUpdate,
    });

    expect(makeWASocket).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: expect.objectContaining({
          creds: {
            registrationId: 1,
          },
        }),
        syncFullHistory: false,
      }),
    );

    expect(fakeSocket.ev.on).toHaveBeenCalledWith('creds.update', saveCreds);
    expect(fakeSocket.ev.on).toHaveBeenCalledWith('connection.update', expect.any(Function));
    expect(fakeSocket.ev.on).toHaveBeenCalledWith('messages.upsert', expect.any(Function));

    eventHandlers['connection.update']({
      connection: 'connecting',
      qr: 'CANARY_PHASE5_QR_SHOULD_NOT_LEAK',
    });

    expect(renderQr).toHaveBeenCalledWith({
      qr: 'CANARY_PHASE5_QR_SHOULD_NOT_LEAK',
      qrOutput: 'terminal',
    });
    expect(onQr).toHaveBeenCalledWith({
      provider: 'baileys',
      qrAvailable: true,
    });
    expect(onConnectionUpdate).toHaveBeenCalledWith({
      connection: 'connecting',
      qr: 'CANARY_PHASE5_QR_SHOULD_NOT_LEAK',
    });

    await provider.destroySession(session);

    expect(fakeSocket.end).toHaveBeenCalled();
    expect(fakeSocket.ws.close).toHaveBeenCalled();
  });

  it('sends outbound direct text messages through the active socket', async () => {
    const { fakeSocket, provider } = createProviderTestHarness();

    const session = await provider.createSession({
      organizationId: '507f1f77bcf86cd799439011',
      whatsappAccountId: '507f1f77bcf86cd799439012',
    });

    const result = await provider.sendTextMessage({
      sessionHandle: session,
      to: '+91 98765 43210',
      text: 'Hello from Phase 5',
    });

    expect(fakeSocket.sendMessage).toHaveBeenCalledWith('919876543210@s.whatsapp.net', {
      text: 'Hello from Phase 5',
    });

    expect(result).toEqual({
      provider: 'baileys',
      sent: true,
      recipientType: 'direct',
      providerMessageId: 'provider-message-id',
    });
  });

  it('normalizes only safe inbound direct messages and ignores groups/status/self messages', async () => {
    const { eventHandlers, provider } = createProviderTestHarness();

    const onInboundMessage = vi.fn();

    await provider.createSession({
      organizationId: '507f1f77bcf86cd799439011',
      whatsappAccountId: '507f1f77bcf86cd799439012',
      onInboundMessage,
    });

    await eventHandlers['messages.upsert']({
      messages: [
        {
          key: {
            remoteJid: '120363418049409533@g.us',
            id: 'group-message-id',
          },
          message: {
            conversation: 'Group should be ignored',
          },
        },
        {
          key: {
            remoteJid: 'status@broadcast',
            id: 'status-message-id',
          },
          message: {
            conversation: 'Status should be ignored',
          },
        },
        {
          key: {
            remoteJid: '919876543210@s.whatsapp.net',
            fromMe: true,
            id: 'self-message-id',
          },
          message: {
            conversation: 'Self message should be ignored',
          },
        },
        {
          key: {
            remoteJid: '919876543210@s.whatsapp.net',
            id: 'direct-message-id',
          },
          pushName: 'Test Sender',
          message: {
            conversation: 'Hello inbound',
          },
          messageTimestamp: 123,
        },
      ],
    });

    expect(onInboundMessage).toHaveBeenCalledTimes(1);
    expect(onInboundMessage).toHaveBeenCalledWith({
      provider: 'baileys',
      normalized: true,
      eventType: 'message.received',
      messageId: 'direct-message-id',
      remoteJid: '919876543210@s.whatsapp.net',
      senderJid: '919876543210@s.whatsapp.net',
      pushName: 'Test Sender',
      text: 'Hello inbound',
      timestamp: 123,
      safe: {
        from: '919***210@s.whatsapp.net',
        textPreview: 'Hello inbound',
      },
    });
  });
});

describe('normalizeBaileysInboundMessage sender resolution', () => {
  // Newer WhatsApp/LID direct messages arrive with an `@lid` remoteJid and an empty-string
  // `participant`. The sender must fall back to remoteJid (|| not ??), otherwise ingestion
  // rejects the message as "sender missing" and the chat never reaches the inbox.
  it('falls back to remoteJid when participant is an empty string (LID direct message)', () => {
    const normalized = normalizeBaileysInboundMessage({
      key: {
        remoteJid: '1779999311@lid',
        participant: '',
        fromMe: false,
        id: 'lid-message-id',
      },
      pushName: 'LID Sender',
      message: { conversation: 'Hi from a LID number' },
      messageTimestamp: 456,
    });

    expect(normalized).not.toBeNull();
    expect(normalized.senderJid).toBe('1779999311@lid');
    expect(normalized.remoteJid).toBe('1779999311@lid');
  });
});

describe('Baileys @lid sender resolution', () => {
  const lidJid = '177850300768311@lid';

  const upsertFrom = ({ jid }) => ({
    messages: [
      {
        key: { id: 'msg-1', remoteJid: jid, participant: '' },
        message: { conversation: 'Hi' },
        pushName: 'Riya',
        messageTimestamp: 1_753_363_200,
      },
    ],
  });

  it('resolves a @lid sender to a phone JID and passes it to ingestion', async () => {
    const { eventHandlers, provider } = createProviderTestHarness({
      socketOverrides: {
        signalRepository: {
          lidMapping: {
            getPNForLID: vi.fn(async () => '919876543210:0@s.whatsapp.net'),
          },
        },
      },
    });

    const onInboundMessage = vi.fn();
    await provider.createSession({ onInboundMessage });
    await eventHandlers['messages.upsert'](upsertFrom({ jid: lidJid }));

    expect(onInboundMessage).toHaveBeenCalledTimes(1);
    const [inbound] = onInboundMessage.mock.calls[0];
    expect(inbound.senderJid).toBe(lidJid);
    expect(inbound.senderPhoneJid).toBe('919876543210:0@s.whatsapp.net');
  });

  it('still delivers the message when the LID mapping is unknown', async () => {
    const { eventHandlers, provider } = createProviderTestHarness({
      socketOverrides: {
        signalRepository: {
          lidMapping: { getPNForLID: vi.fn(async () => null) },
        },
      },
    });

    const onInboundMessage = vi.fn();
    await provider.createSession({ onInboundMessage });
    await eventHandlers['messages.upsert'](upsertFrom({ jid: lidJid }));

    const [inbound] = onInboundMessage.mock.calls[0];
    expect(inbound.senderPhoneJid).toBeUndefined();
    expect(inbound.eventType).toBe('message.received');
  });

  it('survives a throwing LID store and never looks one up for a phone JID', async () => {
    const getPNForLID = vi.fn(async () => {
      throw new Error('keystore unavailable');
    });
    const { eventHandlers, provider } = createProviderTestHarness({
      socketOverrides: { signalRepository: { lidMapping: { getPNForLID } } },
    });

    const onInboundMessage = vi.fn();
    await provider.createSession({ onInboundMessage });

    await eventHandlers['messages.upsert'](upsertFrom({ jid: lidJid }));
    expect(onInboundMessage.mock.calls[0][0].senderPhoneJid).toBeUndefined();

    // A plain phone JID needs no mapping lookup at all.
    await eventHandlers['messages.upsert'](upsertFrom({ jid: '919876543210@s.whatsapp.net' }));
    expect(getPNForLID).toHaveBeenCalledTimes(1);
  });
});
