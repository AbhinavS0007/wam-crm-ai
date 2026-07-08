import { ACCOUNT_STATUSES } from '../../../constants/account-statuses.js';

const LOGGED_OUT_STATUS_CODES = new Set([401, 403, 440]);

const safeString = (value) =>
  String(value ?? '')
    .trim()
    .slice(0, 120);

export const extractBaileysDisconnectStatusCode = (lastDisconnect = {}) =>
  lastDisconnect?.error?.output?.statusCode ??
  lastDisconnect?.error?.statusCode ??
  lastDisconnect?.statusCode ??
  null;

export const extractBaileysDisconnectReason = (lastDisconnect = {}) => {
  const message =
    lastDisconnect?.error?.output?.payload?.error ??
    lastDisconnect?.error?.message ??
    lastDisconnect?.reason ??
    'baileys_disconnect';

  return safeString(message) || 'baileys_disconnect';
};

export const isLoggedOutDisconnect = (lastDisconnect = {}) => {
  const statusCode = extractBaileysDisconnectStatusCode(lastDisconnect);
  const reason = extractBaileysDisconnectReason(lastDisconnect).toLowerCase();

  return LOGGED_OUT_STATUS_CODES.has(Number(statusCode)) || reason.includes('logged out');
};

export const mapBaileysConnectionUpdateToAccountStatus = (connectionUpdate = {}) => {
  if (connectionUpdate.qr) {
    return {
      status: ACCOUNT_STATUSES.CONNECTING,
      disconnectCode: null,
      disconnectReason: null,
      qrAvailable: true,
    };
  }

  if (connectionUpdate.connection === 'open') {
    return {
      status: ACCOUNT_STATUSES.ACTIVE,
      disconnectCode: null,
      disconnectReason: null,
      qrAvailable: false,
    };
  }

  if (connectionUpdate.connection === 'connecting') {
    return {
      status: ACCOUNT_STATUSES.CONNECTING,
      disconnectCode: null,
      disconnectReason: null,
      qrAvailable: false,
    };
  }

  if (connectionUpdate.connection === 'close') {
    const lastDisconnect = connectionUpdate.lastDisconnect ?? {};

    if (isLoggedOutDisconnect(lastDisconnect)) {
      return {
        status: ACCOUNT_STATUSES.DISCONNECTED,
        disconnectCode: 'phone_side_logout',
        disconnectReason: 'WhatsApp account was logged out from the phone side.',
        qrAvailable: false,
      };
    }

    return {
      status: ACCOUNT_STATUSES.RECONNECTING,
      disconnectCode: 'temporary_provider_disconnect',
      disconnectReason: extractBaileysDisconnectReason(lastDisconnect),
      qrAvailable: false,
    };
  }

  return {
    status: null,
    disconnectCode: null,
    disconnectReason: null,
    qrAvailable: false,
  };
};
