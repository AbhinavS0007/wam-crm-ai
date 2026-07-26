import qrcode from 'qrcode';

import { env } from '../../../config/env.js';
import { ACCOUNT_STATUSES } from '../../../constants/account-statuses.js';
import {
  findAccountById as defaultFindAccountById,
  updateAccountStatus as defaultUpdateAccountStatus,
} from '../../whatsapp-accounts/whatsapp-account.repository.js';
import { publishAccountChanged as defaultPublishAccountChanged } from '../../realtime/realtime.publisher.js';
import { createBaileysProvider } from '../providers/baileys.provider.js';
import { WhatsAppProviderError } from '../whatsapp.errors.js';
import { mapBaileysConnectionUpdateToAccountStatus } from './session-status.mapper.js';

const STOPPED_STATUSES = new Set([ACCOUNT_STATUSES.REMOVED, ACCOUNT_STATUSES.BLOCKED]);

// Small settle time after the QR-ready event before requesting a pairing code (avoids 428).
const PAIRING_CODE_DELAY_MS = 1000;

// After a successful link WhatsApp closes with "restart required" (515); we must reconnect.
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 3000;

const asBoolean = (value) => value === true || value === 'true';

/**
 * Manages live WhatsApp sessions for multiple accounts inside the API process. Each account
 * has at most one running session. Reuses the Baileys provider (per-account encrypted
 * auth-state), the connection-status mapper, the inbound ingestion service, and the realtime
 * bus. QR strings are held only in memory and never persisted.
 */
export const createWhatsAppSessionManager = ({
  config = env,
  provider = createBaileysProvider(),
  accountRepository = {
    findAccountById: defaultFindAccountById,
    updateAccountStatus: defaultUpdateAccountStatus,
  },
  inboundMessageService = null,
  publishAccountChanged = defaultPublishAccountChanged,
  now = () => new Date(),
} = {}) => {
  const sessions = new Map();

  const keyOf = (accountId) => accountId?.toString();

  const assertEnabled = () => {
    if (!asBoolean(config.WHATSAPP_ENABLED)) {
      throw new WhatsAppProviderError('WhatsApp connections are disabled by WHATSAPP_ENABLED.', {
        code: 'WHATSAPP_DISABLED',
      });
    }
  };

  const serializeState = (session) => {
    if (!session) {
      return { running: false, status: null, qrAvailable: false };
    }

    return {
      running: true,
      accountId: session.accountId,
      status: session.status,
      qrAvailable: Boolean(session.latestQr),
      pairingCodeAvailable: Boolean(session.latestPairingCode),
      mode: session.pairingMode ? 'pairing' : 'qr',
      startedAt: session.startedAt?.toISOString() ?? null,
      lastUpdateAt: session.lastUpdateAt?.toISOString() ?? null,
    };
  };

  const notifyStatus = async ({ organizationId, accountId, status }) => {
    await publishAccountChanged({ organizationId, accountId, status });
  };

  // Opens (or re-opens) the Baileys socket for a session and wires its callbacks.
  async function openSocket(session) {
    const account = session.account;

    session.sessionHandle = await provider.createSession({
      organizationId: account.organizationId,
      whatsappAccountId: account._id,
      qrOutput: 'none',
      pairingPhoneNumber: session.pairingPhoneNumber,
      pairingCodeRequestDelayMs: PAIRING_CODE_DELAY_MS,
      onPairingCode: async (info) => {
        session.latestPairingCode = info?.pairingCode ?? null;
        session.lastUpdateAt = now();
        await notifyStatus({
          organizationId: account.organizationId,
          accountId: account._id,
          status: ACCOUNT_STATUSES.CONNECTING,
        });
      },
      onPairingCodeError: async (info) => {
        session.pairingError = info?.error?.message ?? 'Pairing code request failed.';
        session.lastUpdateAt = now();
      },
      onConnectionUpdate: (connectionUpdate) =>
        applyConnectionUpdate({ session, connectionUpdate }),
      onInboundMessage: async (inboundMessage) => {
        if (!inboundMessageService) {
          return;
        }
        try {
          await inboundMessageService.ingestInboundMessage({
            organizationId: account.organizationId,
            whatsappAccountId: account._id,
            inboundMessage,
          });
        } catch (error) {
          console.error('Session-manager inbound ingestion failed safely.', {
            code: error?.code,
            name: error?.name,
          });
        }
      },
    });
  }

  // Reconnects after a transient close (e.g. the 515 "restart required" that WhatsApp sends
  // right after a successful link). Capped so a never-linked socket doesn't loop forever.
  function scheduleReconnect(session) {
    if (!sessions.has(session.accountId)) {
      return;
    }

    if (session.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      sessions.delete(session.accountId);
      void accountRepository.updateAccountStatus({
        accountId: session.account._id,
        organizationId: session.account.organizationId,
        status: ACCOUNT_STATUSES.DISCONNECTED,
        disconnectCode: 'reconnect_exhausted',
        disconnectReason: 'Could not reconnect after multiple attempts.',
        now: now(),
      });
      void notifyStatus({
        organizationId: session.account.organizationId,
        accountId: session.account._id,
        status: ACCOUNT_STATUSES.DISCONNECTED,
      });
      return;
    }

    session.reconnectAttempts += 1;
    setTimeout(async () => {
      if (!sessions.has(session.accountId)) {
        return;
      }
      try {
        await provider.destroySession(session.sessionHandle);
      } catch {
        // Ignore teardown errors on the stale socket.
      }
      try {
        await openSocket(session);
      } catch (error) {
        console.error('Session reconnect failed safely.', {
          code: error?.code,
          name: error?.name,
        });
        scheduleReconnect(session);
      }
    }, RECONNECT_DELAY_MS);
  }

  async function applyConnectionUpdate({ session, connectionUpdate }) {
    // Ignore late events for a session we already tore down (e.g. manual disconnect).
    if (!sessions.has(session.accountId)) {
      return { status: null };
    }

    const account = session.account;

    // The raw QR string arrives on the connection update; hold it in memory only.
    // In pairing (phone-number) mode we ignore the QR and use the pairing code instead.
    if (connectionUpdate.qr && !session.pairingMode) {
      session.latestQr = connectionUpdate.qr;
      session.lastUpdateAt = now();
    }

    const mapped = mapBaileysConnectionUpdateToAccountStatus(connectionUpdate);

    if (!mapped.status) {
      return mapped;
    }

    session.status = mapped.status;
    session.lastUpdateAt = now();
    if (mapped.status === ACCOUNT_STATUSES.ACTIVE) {
      session.latestQr = null;
      session.latestPairingCode = null;
      session.reconnectAttempts = 0;
    }

    await accountRepository.updateAccountStatus({
      accountId: account._id,
      organizationId: account.organizationId,
      status: mapped.status,
      disconnectCode: mapped.disconnectCode,
      disconnectReason: mapped.disconnectReason,
      now: now(),
    });

    await notifyStatus({
      organizationId: account.organizationId,
      accountId: account._id,
      status: mapped.status,
    });

    if (mapped.status === ACCOUNT_STATUSES.RECONNECTING) {
      scheduleReconnect(session);
    } else if (mapped.status === ACCOUNT_STATUSES.DISCONNECTED) {
      // Phone-side logout — stop and drop the session.
      sessions.delete(session.accountId);
    }

    return mapped;
  }

  const connectAccount = async ({ account, pairingPhoneNumber } = {}) => {
    assertEnabled();

    if (!account) {
      throw new WhatsAppProviderError('Account is required to connect.', {
        code: 'WHATSAPP_ACCOUNT_REQUIRED',
      });
    }

    if (STOPPED_STATUSES.has(account.status)) {
      throw new WhatsAppProviderError(
        `WhatsApp account cannot connect from status ${account.status}.`,
        { code: 'WHATSAPP_ACCOUNT_NOT_STARTABLE' },
      );
    }

    const key = keyOf(account._id);

    if (sessions.has(key)) {
      return serializeState(sessions.get(key));
    }

    await accountRepository.updateAccountStatus({
      accountId: account._id,
      organizationId: account.organizationId,
      status: ACCOUNT_STATUSES.CONNECTING,
      now: now(),
    });

    const session = {
      accountId: key,
      account,
      organizationId: account.organizationId?.toString(),
      status: ACCOUNT_STATUSES.CONNECTING,
      latestQr: null,
      latestPairingCode: null,
      pairingMode: Boolean(pairingPhoneNumber),
      pairingPhoneNumber,
      pairingError: null,
      reconnectAttempts: 0,
      startedAt: now(),
      lastUpdateAt: now(),
      sessionHandle: null,
    };
    sessions.set(key, session);

    try {
      await openSocket(session);
    } catch (error) {
      sessions.delete(key);
      throw error;
    }

    return serializeState(session);
  };

  const getQrDataUrl = async (accountId) => {
    const session = sessions.get(keyOf(accountId));

    if (!session?.latestQr) {
      return null;
    }

    return qrcode.toDataURL(session.latestQr);
  };

  const getPairingCode = (accountId) => {
    const session = sessions.get(keyOf(accountId));
    return session?.latestPairingCode ?? null;
  };

  const getSessionState = (accountId) => serializeState(sessions.get(keyOf(accountId)));

  const listRuntimeStates = () => [...sessions.values()].map((session) => serializeState(session));

  const sendTextMessage = async ({ accountId, to, text } = {}) => {
    const session = sessions.get(keyOf(accountId));

    if (!session?.sessionHandle) {
      throw new WhatsAppProviderError('No running session for this account.', {
        code: 'WHATSAPP_SESSION_NOT_RUNNING',
      });
    }

    return provider.sendTextMessage({ sessionHandle: session.sessionHandle, to, text });
  };

  const disconnectAccount = async ({
    accountId,
    organizationId,
    status = ACCOUNT_STATUSES.DISCONNECTED,
    disconnectCode = 'manual_disconnect',
    disconnectReason = 'Disconnected from the app.',
  } = {}) => {
    const key = keyOf(accountId);
    const session = sessions.get(key);

    if (session) {
      sessions.delete(key);
      try {
        await provider.destroySession(session.sessionHandle);
      } catch {
        // Ignore teardown errors.
      }
    }

    await accountRepository.updateAccountStatus({
      accountId,
      organizationId,
      status,
      disconnectCode,
      disconnectReason,
      now: now(),
    });

    await notifyStatus({ organizationId, accountId, status });

    return serializeState(null);
  };

  const stopAll = async () => {
    const running = [...sessions.values()];
    sessions.clear();
    await Promise.allSettled(
      running.map((session) => provider.destroySession(session.sessionHandle)),
    );
  };

  return {
    connectAccount,
    disconnectAccount,
    getQrDataUrl,
    getPairingCode,
    getSessionState,
    listRuntimeStates,
    sendTextMessage,
    stopAll,
  };
};
