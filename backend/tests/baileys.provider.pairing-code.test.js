import { describe, expect, it, vi } from 'vitest';

import { createBaileysProvider } from '../src/modules/whatsapp/providers/baileys.provider.js';

describe('Baileys provider pairing-code fallback', () => {
  it('requests a pairing code only after the connection reaches connecting or QR event', async () => {
    const fakeState = {
      state: {
        creds: {},
        keys: {},
      },
      saveCreds: vi.fn(),
    };

    const requestPairingCode = vi.fn().mockResolvedValue('1234-5678');

    const handlers = new Map();

    const fakeSocket = {
      ev: {
        on: vi.fn((eventName, handler) => {
          handlers.set(eventName, handler);
        }),
      },
      requestPairingCode,
      end: vi.fn(),
      ws: {
        close: vi.fn(),
      },
    };

    const makeWASocket = vi.fn(() => fakeSocket);
    const renderPairingCode = vi.fn();
    const onPairingCode = vi.fn();

    const provider = createBaileysProvider({
      renderPairingCode,
      loadPackage: async () => ({
        makeWASocket,
        initAuthCreds: vi.fn(),
        proto: {},
      }),
      createAuthState: async () => fakeState,
    });

    await provider.createSession({
      organizationId: 'organization-id',
      whatsappAccountId: 'whatsapp-account-id',
      pairingPhoneNumber: '+91 98765 43210',
      onPairingCode,
    });

    expect(requestPairingCode).not.toHaveBeenCalled();

    await handlers.get('connection.update')({
      connection: 'connecting',
    });

    expect(requestPairingCode).toHaveBeenCalledWith('919876543210');
    expect(renderPairingCode).toHaveBeenCalledWith({
      pairingCode: '1234-5678',
    });
    expect(onPairingCode).toHaveBeenCalledWith({
      provider: 'baileys',
      pairingCodeAvailable: true,
    });
  });

  it('requests a pairing code only once even if multiple connecting events arrive', async () => {
    const fakeState = {
      state: {
        creds: {},
        keys: {},
      },
      saveCreds: vi.fn(),
    };

    const requestPairingCode = vi.fn().mockResolvedValue('1234-5678');

    const handlers = new Map();

    const fakeSocket = {
      ev: {
        on: vi.fn((eventName, handler) => {
          handlers.set(eventName, handler);
        }),
      },
      requestPairingCode,
      end: vi.fn(),
      ws: {
        close: vi.fn(),
      },
    };

    const provider = createBaileysProvider({
      renderPairingCode: vi.fn(),
      loadPackage: async () => ({
        makeWASocket: vi.fn(() => fakeSocket),
        initAuthCreds: vi.fn(),
        proto: {},
      }),
      createAuthState: async () => fakeState,
    });

    await provider.createSession({
      organizationId: 'organization-id',
      whatsappAccountId: 'whatsapp-account-id',
      pairingPhoneNumber: '919876543210',
    });

    await handlers.get('connection.update')({
      connection: 'connecting',
    });

    await handlers.get('connection.update')({
      connection: 'connecting',
    });

    await handlers.get('connection.update')({
      qr: 'CANARY_QR_SHOULD_NOT_BE_USED_FOR_PAIRING_TEST',
    });

    expect(requestPairingCode).toHaveBeenCalledTimes(1);
  });

  it('reports pairing-code errors safely without throwing raw provider errors', async () => {
    const fakeState = {
      state: {
        creds: {},
        keys: {},
      },
      saveCreds: vi.fn(),
    };

    const requestPairingCode = vi.fn().mockRejectedValue({
      name: 'BoomError',
      message: 'Connection Closed',
      output: {
        statusCode: 428,
      },
    });

    const handlers = new Map();

    const fakeSocket = {
      ev: {
        on: vi.fn((eventName, handler) => {
          handlers.set(eventName, handler);
        }),
      },
      requestPairingCode,
      end: vi.fn(),
      ws: {
        close: vi.fn(),
      },
    };

    const provider = createBaileysProvider({
      logger: {
        error: vi.fn(),
      },
      loadPackage: async () => ({
        makeWASocket: vi.fn(() => fakeSocket),
        initAuthCreds: vi.fn(),
        proto: {},
      }),
      createAuthState: async () => fakeState,
    });

    const onPairingCodeError = vi.fn();

    await provider.createSession({
      organizationId: 'organization-id',
      whatsappAccountId: 'whatsapp-account-id',
      pairingPhoneNumber: '919876543210',
      onPairingCodeError,
    });

    await handlers.get('connection.update')({
      connection: 'connecting',
    });

    expect(onPairingCodeError).toHaveBeenCalledWith({
      provider: 'baileys',
      pairingCodeAvailable: false,
      error: {
        name: 'BoomError',
        message: 'Connection Closed',
        code: undefined,
        statusCode: 428,
      },
    });
  });
});
