import { describe, expect, it, vi } from 'vitest';

import { ACCOUNT_STATUSES } from '../src/constants/account-statuses.js';
import { createSingleSessionService } from '../src/modules/whatsapp/sessions/single-session.service.js';
import { WhatsAppProviderError } from '../src/modules/whatsapp/whatsapp.errors.js';

const createFakeAccount = () => ({
  _id: '507f1f77bcf86cd799439012',
  organizationId: '507f1f77bcf86cd799439011',
  status: ACCOUNT_STATUSES.PENDING,
});

const createConfig = (overrides = {}) => ({
  WHATSAPP_ENABLED: true,
  WHATSAPP_ALLOW_DISPOSABLE_POC_ONLY: true,
  WHATSAPP_POC_ACCOUNT_ID: '507f1f77bcf86cd799439012',
  WHATSAPP_QR_OUTPUT: 'terminal',
  ...overrides,
});

describe('Phase 5 single-session service', () => {
  it('blocks startup when WhatsApp is disabled', async () => {
    const service = createSingleSessionService({
      config: createConfig({
        WHATSAPP_ENABLED: false,
      }),
      provider: {
        name: 'fake',
      },
    });

    await expect(service.startSingleSession()).rejects.toThrow(WhatsAppProviderError);
  });

  it('blocks any account other than WHATSAPP_POC_ACCOUNT_ID', async () => {
    const service = createSingleSessionService({
      config: createConfig(),
      provider: {
        name: 'fake',
      },
    });

    await expect(
      service.startSingleSession({
        accountId: '507f1f77bcf86cd799439099',
      }),
    ).rejects.toThrow(WhatsAppProviderError);
  });

  it('starts one POC session and updates account statuses safely', async () => {
    const account = createFakeAccount();
    const statusUpdates = [];

    const provider = {
      name: 'fake-provider',
      createSession: vi.fn(async (input) => {
        await input.onConnectionUpdate({
          connection: 'open',
        });

        return {
          close: vi.fn(),
        };
      }),
      destroySession: vi.fn(async () => ({
        destroyed: true,
      })),
    };

    const service = createSingleSessionService({
      config: createConfig(),
      provider,
      accountRepository: {
        findAccountById: vi.fn(async () => account),
        updateAccountStatus: vi.fn(async (update) => {
          statusUpdates.push(update);
          return {
            ...account,
            status: update.status,
          };
        }),
      },
      now: () => new Date('2026-07-07T12:00:00.000Z'),
    });

    const result = await service.startSingleSession();

    expect(result.started).toBe(true);
    expect(result.session.running).toBe(true);
    expect(result.session.accountId).toBe(account._id);
    expect(provider.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: account.organizationId,
        whatsappAccountId: account._id,
        qrOutput: 'terminal',
        onQr: expect.any(Function),
        onConnectionUpdate: expect.any(Function),
      }),
    );

    expect(statusUpdates.map((update) => update.status)).toEqual([
      ACCOUNT_STATUSES.CONNECTING,
      ACCOUNT_STATUSES.ACTIVE,
    ]);
  });

  it('forwards outbound text through the running provider session', async () => {
    const account = createFakeAccount();
    const sessionHandle = {
      socket: {
        sendMessage: vi.fn(),
      },
    };

    const provider = {
      name: 'fake-provider',
      createSession: vi.fn(async () => sessionHandle),
      destroySession: vi.fn(),
      sendTextMessage: vi.fn(async () => ({
        provider: 'fake-provider',
        sent: true,
      })),
    };

    const service = createSingleSessionService({
      config: createConfig(),
      provider,
      accountRepository: {
        findAccountById: vi.fn(async () => account),
        updateAccountStatus: vi.fn(async (update) => ({
          ...account,
          status: update.status,
        })),
      },
      now: () => new Date('2026-07-07T12:00:00.000Z'),
    });

    await service.startSingleSession();

    await expect(
      service.sendTextMessage({
        to: '919876543210',
        text: 'Hello from service',
      }),
    ).resolves.toEqual({
      provider: 'fake-provider',
      sent: true,
    });

    expect(provider.sendTextMessage).toHaveBeenCalledWith({
      sessionHandle,
      to: '919876543210',
      text: 'Hello from service',
      message: undefined,
    });
  });

  it('blocks outbound text when no POC session is running', async () => {
    const service = createSingleSessionService({
      config: createConfig(),
      provider: {
        name: 'fake-provider',
      },
    });

    await expect(
      service.sendTextMessage({
        to: '919876543210',
        text: 'Hello',
      }),
    ).rejects.toThrow(WhatsAppProviderError);
  });

  it('stops a running POC session without logging out from phone side', async () => {
    const account = createFakeAccount();
    const statusUpdates = [];
    const close = vi.fn();

    const provider = {
      name: 'fake-provider',
      createSession: vi.fn(async () => ({
        close,
      })),
      destroySession: vi.fn(async (sessionHandle) => {
        await sessionHandle.close();

        return {
          destroyed: true,
        };
      }),
    };

    const service = createSingleSessionService({
      config: createConfig(),
      provider,
      accountRepository: {
        findAccountById: vi.fn(async () => account),
        updateAccountStatus: vi.fn(async (update) => {
          statusUpdates.push(update);
          return {
            ...account,
            status: update.status,
          };
        }),
      },
      now: () => new Date('2026-07-07T12:00:00.000Z'),
    });

    await service.startSingleSession();
    const stopped = await service.stopSingleSession();

    expect(stopped.stopped).toBe(true);
    expect(provider.destroySession).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
    expect(statusUpdates.at(-1)).toMatchObject({
      status: ACCOUNT_STATUSES.DISCONNECTED,
      disconnectCode: 'manual_session_stop',
    });
  });
});
