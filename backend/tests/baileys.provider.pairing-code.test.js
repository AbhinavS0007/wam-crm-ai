import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createBaileysProvider } from '../src/modules/whatsapp/providers/baileys.provider.js';

describe('Baileys provider pairing-code fallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('requests a pairing code with a sanitized local phone number after a safe delay', async () => {
    const fakeState = {
      state: {
        creds: {},
        keys: {},
      },
      saveCreds: vi.fn(),
    };

    const requestPairingCode = vi.fn().mockResolvedValue('1234-5678');

    const fakeSocket = {
      ev: {
        on: vi.fn(),
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
      pairingCodeRequestDelayMs: 1000,
      onPairingCode,
    });

    expect(requestPairingCode).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);

    expect(requestPairingCode).toHaveBeenCalledWith('919876543210');
    expect(renderPairingCode).toHaveBeenCalledWith({
      pairingCode: '1234-5678',
    });
    expect(onPairingCode).toHaveBeenCalledWith({
      provider: 'baileys',
      pairingCodeAvailable: true,
    });
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

    const fakeSocket = {
      ev: {
        on: vi.fn(),
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
      pairingCodeRequestDelayMs: 1000,
      onPairingCodeError,
    });

    await vi.advanceTimersByTimeAsync(1000);

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
