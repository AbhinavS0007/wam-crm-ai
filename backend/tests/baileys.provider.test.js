import { describe, expect, it, vi } from 'vitest';

import { createBaileysProvider } from '../src/modules/whatsapp/providers/baileys.provider.js';

describe('Baileys provider runtime boundary', () => {
  it('creates a socket using injected Baileys package and encrypted auth-state adapter', async () => {
    const eventHandlers = {};
    const fakeSocket = {
      ev: {
        on: vi.fn((eventName, handler) => {
          eventHandlers[eventName] = handler;
        }),
      },
      end: vi.fn(),
      ws: {
        close: vi.fn(),
      },
    };

    const makeWASocket = vi.fn(() => fakeSocket);
    const saveCreds = vi.fn();

    const provider = createBaileysProvider({
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
        printQRInTerminal: true,
        syncFullHistory: false,
      }),
    );

    expect(fakeSocket.ev.on).toHaveBeenCalledWith('creds.update', saveCreds);
    expect(fakeSocket.ev.on).toHaveBeenCalledWith('connection.update', expect.any(Function));

    eventHandlers['connection.update']({
      connection: 'connecting',
      qr: 'CANARY_PHASE5_QR_SHOULD_NOT_LEAK',
    });

    expect(onQr).toHaveBeenCalledWith({
      provider: 'baileys',
      qr: 'CANARY_PHASE5_QR_SHOULD_NOT_LEAK',
    });
    expect(onConnectionUpdate).toHaveBeenCalledWith({
      connection: 'connecting',
      qr: 'CANARY_PHASE5_QR_SHOULD_NOT_LEAK',
    });

    await provider.destroySession(session);

    expect(fakeSocket.end).toHaveBeenCalled();
    expect(fakeSocket.ws.close).toHaveBeenCalled();
  });
});
