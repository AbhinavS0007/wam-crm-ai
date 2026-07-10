import { env } from '../../../config/env.js';
import { ACCOUNT_STATUSES } from '../../../constants/account-statuses.js';
import {
  findAccountById,
  updateAccountStatus,
} from '../../whatsapp-accounts/whatsapp-account.repository.js';
import { createBaileysProvider } from '../providers/baileys.provider.js';
import { WhatsAppProviderError } from '../whatsapp.errors.js';
import { mapBaileysConnectionUpdateToAccountStatus } from './session-status.mapper.js';

const STOPPED_STATUSES = new Set([ACCOUNT_STATUSES.REMOVED, ACCOUNT_STATUSES.BLOCKED]);

const asBoolean = (value) => value === true || value === 'true';

const serializeRuntimeSession = (session) => {
  if (!session) {
    return {
      running: false,
    };
  }

  return {
    running: true,
    accountId: session.accountId?.toString(),
    organizationId: session.organizationId?.toString(),
    provider: session.providerName,
    startedAt: session.startedAt?.toISOString(),
    qrAvailable: Boolean(session.qrAvailable),
    lastConnectionUpdateAt: session.lastConnectionUpdateAt?.toISOString() ?? null,
  };
};

export const createSingleSessionService = ({
  config = env,
  provider = createBaileysProvider(),
  accountRepository = {
    findAccountById,
    updateAccountStatus,
  },
  now = () => new Date(),
} = {}) => {
  let currentSession = null;

  const assertStartupAllowed = ({ accountId } = {}) => {
    if (!asBoolean(config.WHATSAPP_ENABLED)) {
      throw new WhatsAppProviderError('WhatsApp startup is disabled by WHATSAPP_ENABLED.', {
        code: 'WHATSAPP_DISABLED',
      });
    }

    if (!asBoolean(config.WHATSAPP_ALLOW_DISPOSABLE_POC_ONLY)) {
      throw new WhatsAppProviderError('Phase 5 requires disposable POC-only mode.', {
        code: 'WHATSAPP_POC_SAFETY_DISABLED',
      });
    }

    if (!accountId) {
      throw new WhatsAppProviderError('WHATSAPP_POC_ACCOUNT_ID or accountId is required.', {
        code: 'WHATSAPP_POC_ACCOUNT_REQUIRED',
      });
    }

    if (config.WHATSAPP_POC_ACCOUNT_ID && accountId !== config.WHATSAPP_POC_ACCOUNT_ID) {
      throw new WhatsAppProviderError('Only WHATSAPP_POC_ACCOUNT_ID can be started in Phase 5.', {
        code: 'WHATSAPP_POC_ACCOUNT_MISMATCH',
      });
    }
  };

  const applyConnectionUpdate = async ({ account, connectionUpdate }) => {
    const mapped = mapBaileysConnectionUpdateToAccountStatus(connectionUpdate);

    if (!mapped.status) {
      return mapped;
    }

    await accountRepository.updateAccountStatus({
      accountId: account._id,
      organizationId: account.organizationId,
      status: mapped.status,
      disconnectCode: mapped.disconnectCode,
      disconnectReason: mapped.disconnectReason,
      now: now(),
    });

    if (currentSession) {
      currentSession.qrAvailable = Boolean(mapped.qrAvailable);
      currentSession.lastConnectionUpdateAt = now();
    }

    return mapped;
  };

  const startSingleSession = async ({
    accountId = config.WHATSAPP_POC_ACCOUNT_ID,
    qrOutput = config.WHATSAPP_QR_OUTPUT,
    pairingPhoneNumber,
    pairingCodeRequestDelayMs,
    onPairingCode,
    onPairingCodeError,
    onInboundMessage,
  } = {}) => {
    assertStartupAllowed({
      accountId,
    });

    if (currentSession?.accountId?.toString() === accountId) {
      return {
        started: false,
        session: serializeRuntimeSession(currentSession),
      };
    }

    if (currentSession) {
      throw new WhatsAppProviderError('Only one WhatsApp session can run in Phase 5.', {
        code: 'WHATSAPP_SINGLE_SESSION_ALREADY_RUNNING',
      });
    }

    const account = await accountRepository.findAccountById({
      accountId,
    });

    if (!account) {
      throw new WhatsAppProviderError('WhatsApp POC account was not found.', {
        code: 'WHATSAPP_POC_ACCOUNT_NOT_FOUND',
      });
    }

    if (STOPPED_STATUSES.has(account.status)) {
      throw new WhatsAppProviderError(
        `WhatsApp account cannot start from status ${account.status}.`,
        {
          code: 'WHATSAPP_ACCOUNT_NOT_STARTABLE',
        },
      );
    }

    await accountRepository.updateAccountStatus({
      accountId: account._id,
      organizationId: account.organizationId,
      status: ACCOUNT_STATUSES.CONNECTING,
      now: now(),
    });

    const sessionHandle = await provider.createSession({
      organizationId: account.organizationId,
      whatsappAccountId: account._id,
      qrOutput,
      pairingPhoneNumber,
      pairingCodeRequestDelayMs,
      onPairingCode,
      onPairingCodeError,
      onInboundMessage,
      onQr: async () => {
        if (currentSession) {
          currentSession.qrAvailable = true;
          currentSession.lastConnectionUpdateAt = now();
        }
      },
      onConnectionUpdate: async (connectionUpdate) =>
        applyConnectionUpdate({
          account,
          connectionUpdate,
        }),
    });

    currentSession = {
      accountId: account._id,
      organizationId: account.organizationId,
      providerName: provider.name,
      sessionHandle,
      startedAt: now(),
      qrAvailable: false,
      lastConnectionUpdateAt: null,
    };

    return {
      started: true,
      session: serializeRuntimeSession(currentSession),
    };
  };

  const stopSingleSession = async ({ disconnectCode = 'manual_session_stop' } = {}) => {
    if (!currentSession) {
      return {
        stopped: false,
        session: serializeRuntimeSession(currentSession),
      };
    }

    const sessionToStop = currentSession;
    currentSession = null;

    await provider.destroySession(sessionToStop.sessionHandle);

    await accountRepository.updateAccountStatus({
      accountId: sessionToStop.accountId,
      organizationId: sessionToStop.organizationId,
      status: ACCOUNT_STATUSES.DISCONNECTED,
      disconnectCode,
      disconnectReason: 'Phase 5 single session was stopped locally.',
      now: now(),
    });

    return {
      stopped: true,
      session: serializeRuntimeSession(null),
    };
  };

  const sendTextMessage = async ({ to, text, message } = {}) => {
    if (!currentSession) {
      throw new WhatsAppProviderError('No WhatsApp session is running.', {
        code: 'WHATSAPP_SESSION_NOT_RUNNING',
      });
    }

    return provider.sendTextMessage({
      sessionHandle: currentSession.sessionHandle,
      to,
      text,
      message,
    });
  };

  const inspectSingleSession = () => serializeRuntimeSession(currentSession);

  return {
    startSingleSession,
    stopSingleSession,
    sendTextMessage,
    inspectSingleSession,
  };
};
