import { describe, expect, it, vi } from 'vitest';

import { createBaileysProvider } from '../src/modules/whatsapp/providers/baileys.provider.js';

describe('Baileys provider pairing-code fallback', () => {
  it('requests a pairing code with a sanitized local phone number', async () => {
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
      onPairingCode,
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
});
