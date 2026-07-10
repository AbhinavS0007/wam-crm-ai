import { describe, expect, it, vi } from 'vitest';

import { createBaileysProvider } from '../src/modules/whatsapp/providers/baileys.provider.js';

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
      text: 'Hello inbound',
      timestamp: 123,
      safe: {
        from: '919***210@s.whatsapp.net',
        textPreview: 'Hello inbound',
      },
    });
  });
});
