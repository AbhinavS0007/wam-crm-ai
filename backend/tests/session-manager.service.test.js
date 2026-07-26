import { describe, expect, it, vi } from 'vitest';

import { ACCOUNT_STATUSES } from '../src/constants/account-statuses.js';
import { createWhatsAppSessionManager } from '../src/modules/whatsapp/sessions/session-manager.service.js';
import { WhatsAppProviderError } from '../src/modules/whatsapp/whatsapp.errors.js';

const ACCOUNT = {
  _id: '507f1f77bcf86cd799439012',
  organizationId: '507f1f77bcf86cd799439011',
  status: ACCOUNT_STATUSES.PENDING,
};

const createConfig = (overrides = {}) => ({ WHATSAPP_ENABLED: true, ...overrides });

const createManager = (overrides = {}) => {
  const captured = {};
  const provider = {
    name: 'fake',
    createSession: vi.fn(async (input) => {
      captured.input = input;
      return { socket: {}, close: vi.fn() };
    }),
    destroySession: vi.fn(async () => ({ destroyed: true })),
    sendTextMessage: vi.fn(async () => ({ sent: true, providerMessageId: 'wamid-1' })),
  };
  const updates = [];
  const published = [];

  const manager = createWhatsAppSessionManager({
    config: createConfig(),
    provider,
    accountRepository: {
      findAccountById: vi.fn(async () => ACCOUNT),
      updateAccountStatus: vi.fn(async (u) => {
        updates.push(u);
        return { ...ACCOUNT, status: u.status };
      }),
    },
    publishAccountChanged: vi.fn(async (e) => published.push(e)),
    now: () => new Date('2026-07-25T10:00:00.000Z'),
    ...overrides,
  });

  return { manager, provider, updates, published, captured };
};

describe('WhatsApp session manager', () => {
  it('refuses to connect when WhatsApp is disabled', async () => {
    const { manager } = createManager({ config: createConfig({ WHATSAPP_ENABLED: false }) });
    await expect(manager.connectAccount({ account: ACCOUNT })).rejects.toThrow(
      WhatsAppProviderError,
    );
  });

  it('connects an account, marks it CONNECTING, and registers the session', async () => {
    const { manager, provider, updates } = createManager();

    const state = await manager.connectAccount({ account: ACCOUNT });

    expect(provider.createSession).toHaveBeenCalledTimes(1);
    expect(state.running).toBe(true);
    expect(updates[0].status).toBe(ACCOUNT_STATUSES.CONNECTING);
    expect(manager.getSessionState(ACCOUNT._id).running).toBe(true);
  });

  it('captures the QR from the connection update and exposes a data URL', async () => {
    const { manager, captured, published } = createManager();
    await manager.connectAccount({ account: ACCOUNT });

    await captured.input.onConnectionUpdate({ qr: 'QR-STRING-DO-NOT-LEAK' });

    expect(manager.getSessionState(ACCOUNT._id).qrAvailable).toBe(true);
    const dataUrl = await manager.getQrDataUrl(ACCOUNT._id);
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    // Realtime received a connecting signal.
    expect(published.some((e) => e.status === ACCOUNT_STATUSES.CONNECTING)).toBe(true);
  });

  it('advances to ACTIVE and clears the QR on connection open', async () => {
    const { manager, captured, updates } = createManager();
    await manager.connectAccount({ account: ACCOUNT });

    await captured.input.onConnectionUpdate({ qr: 'QR' });
    await captured.input.onConnectionUpdate({ connection: 'open' });

    expect(manager.getSessionState(ACCOUNT._id).status).toBe(ACCOUNT_STATUSES.ACTIVE);
    expect(manager.getSessionState(ACCOUNT._id).qrAvailable).toBe(false);
    expect(updates.map((u) => u.status)).toContain(ACCOUNT_STATUSES.ACTIVE);
  });

  it('routes inbound messages to the ingestion service', async () => {
    const ingest = vi.fn(async () => ({ persisted: true }));
    const { manager, captured } = createManager({
      inboundMessageService: { ingestInboundMessage: ingest },
    });
    await manager.connectAccount({ account: ACCOUNT });

    await captured.input.onInboundMessage({
      eventType: 'message.received',
      senderJid: 'x@s.whatsapp.net',
    });

    expect(ingest).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ACCOUNT.organizationId,
        whatsappAccountId: ACCOUNT._id,
      }),
    );
  });

  it('sends outbound text through the running session', async () => {
    const { manager, provider } = createManager();
    await manager.connectAccount({ account: ACCOUNT });

    const result = await manager.sendTextMessage({
      accountId: ACCOUNT._id,
      to: '919876543210',
      text: 'Hi',
    });

    expect(result).toMatchObject({ sent: true });
    expect(provider.sendTextMessage).toHaveBeenCalledWith(
      expect.objectContaining({ to: '919876543210', text: 'Hi' }),
    );
  });

  it('disconnects and drops the session', async () => {
    const { manager, provider, updates } = createManager();
    await manager.connectAccount({ account: ACCOUNT });

    await manager.disconnectAccount({
      accountId: ACCOUNT._id,
      organizationId: ACCOUNT.organizationId,
    });

    expect(provider.destroySession).toHaveBeenCalled();
    expect(manager.getSessionState(ACCOUNT._id).running).toBe(false);
    expect(updates.at(-1).status).toBe(ACCOUNT_STATUSES.DISCONNECTED);
  });

  it('is idempotent when connecting an already-running account', async () => {
    const { manager, provider } = createManager();
    await manager.connectAccount({ account: ACCOUNT });
    await manager.connectAccount({ account: ACCOUNT });
    expect(provider.createSession).toHaveBeenCalledTimes(1);
  });

  it('reconnects after a restart-required (515) close', async () => {
    vi.useFakeTimers();
    try {
      const { manager, provider, captured } = createManager();
      await manager.connectAccount({ account: ACCOUNT });
      expect(provider.createSession).toHaveBeenCalledTimes(1);

      await captured.input.onConnectionUpdate({
        connection: 'close',
        lastDisconnect: { error: { output: { statusCode: 515 } } },
      });
      expect(manager.getSessionState(ACCOUNT._id).status).toBe(ACCOUNT_STATUSES.RECONNECTING);

      await vi.advanceTimersByTimeAsync(3000);
      expect(provider.destroySession).toHaveBeenCalled();
      expect(provider.createSession).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not reconnect after a phone-side logout', async () => {
    vi.useFakeTimers();
    try {
      const { manager, provider, captured } = createManager();
      await manager.connectAccount({ account: ACCOUNT });

      await captured.input.onConnectionUpdate({
        connection: 'close',
        lastDisconnect: { error: { output: { statusCode: 401 } } },
      });

      expect(manager.getSessionState(ACCOUNT._id).running).toBe(false);
      await vi.advanceTimersByTimeAsync(5000);
      expect(provider.createSession).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
