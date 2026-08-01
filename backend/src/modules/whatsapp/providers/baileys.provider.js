import qrcodeTerminal from 'qrcode-terminal';

import { createEncryptedBaileysAuthState } from '../auth-state/baileys-auth-state.adapter.js';
import { WhatsAppProviderNotReadyError } from '../whatsapp.errors.js';
import { assertWhatsAppProvider, WHATSAPP_PROVIDER_NAMES } from './whatsapp-provider.interface.js';

export const BAILEYS_IMPORT_TARGET = '@whiskeysockets/baileys';

export const loadBaileysPackage = () => import(BAILEYS_IMPORT_TARGET);

const safeCall = async ({ callback, logger, label, value }) => {
  if (typeof callback !== 'function') {
    return;
  }

  try {
    await callback(value);
  } catch (error) {
    logger?.error?.(`${label} failed safely.`, {
      code: error?.code,
      name: error?.name,
      message: error?.message,
    });
  }
};

const resolveMakeWASocket = (baileysPackage) =>
  baileysPackage.makeWASocket ?? baileysPackage.default;

export const renderTerminalQr = ({ qr, qrOutput = 'terminal' } = {}) => {
  if (!qr || qrOutput !== 'terminal') {
    return;
  }

  console.log('Phase 5 WhatsApp QR is ready. Scan only with POC-WhatsApp-01.');
  console.log('Do not copy, screenshot, paste or store this QR.');
  qrcodeTerminal.generate(qr, {
    small: true,
  });
};

export const createSafeBaileysLogger = () => {
  const noop = () => {};
  const safeLogger = {
    trace: noop,
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    fatal: noop,
  };

  safeLogger.child = () => safeLogger;

  return safeLogger;
};

export const sanitizePairingPhoneNumber = (phoneNumber) => {
  const normalizedPhoneNumber = String(phoneNumber ?? '')
    .trim()
    .replace(/^\+/, '')
    .replace(/[\s()-]/g, '');

  if (!/^\d{8,15}$/.test(normalizedPhoneNumber)) {
    throw new WhatsAppProviderNotReadyError(
      'Pairing phone number must include country code and digits only.',
    );
  }

  return normalizedPhoneNumber;
};

export const resolveDirectMessageJid = (to) => {
  const recipient = String(to ?? '').trim();

  if (!recipient) {
    throw new WhatsAppProviderNotReadyError('Baileys message recipient is required.');
  }

  if (recipient.includes('@')) {
    return recipient;
  }

  return `${sanitizePairingPhoneNumber(recipient)}@s.whatsapp.net`;
};

export const maskBaileysJid = (jid = '') => {
  if (!jid || typeof jid !== 'string') {
    return 'unknown';
  }

  const [left, domain = 'unknown'] = jid.split('@');
  const visibleStart = left.slice(0, 3);
  const visibleEnd = left.slice(-3);

  return `${visibleStart}***${visibleEnd}@${domain}`;
};

export const extractBaileysText = (message = {}) =>
  message?.message?.conversation ||
  message?.message?.extendedTextMessage?.text ||
  message?.message?.imageMessage?.caption ||
  message?.message?.videoMessage?.caption ||
  '';

export const shouldIgnoreBaileysInboundMessage = (message = {}) => {
  const remoteJid = message?.key?.remoteJid;

  return (
    !message?.message ||
    Boolean(message?.key?.fromMe) ||
    !remoteJid ||
    remoteJid.endsWith('@g.us') ||
    remoteJid === 'status@broadcast'
  );
};

export const isLidJid = (jid) => typeof jid === 'string' && jid.trim().endsWith('@lid');

/**
 * Resolves a `@lid` sender to its phone-number JID using the session's LID mapping store.
 *
 * WhatsApp increasingly delivers direct messages from an opaque LinkedID (`<id>@lid`) rather
 * than `<phone>@s.whatsapp.net`, so the phone cannot be parsed out of the JID. Baileys keeps a
 * reverse mapping in the `lid-mapping` keystore (Mongo-backed here through the auth-state
 * adapter). Returns null for non-LID input or when the mapping is not known yet — callers must
 * treat a missing phone as normal, not an error.
 */
export const resolveLidPhoneJid = async ({ socket, jid } = {}) => {
  if (!isLidJid(jid)) {
    return null;
  }

  const lidMapping = socket?.signalRepository?.lidMapping;

  if (typeof lidMapping?.getPNForLID !== 'function') {
    return null;
  }

  try {
    return (await lidMapping.getPNForLID(jid)) ?? null;
  } catch {
    // A missing or unreadable mapping must never drop the inbound message.
    return null;
  }
};

export const normalizeBaileysInboundMessage = (message = {}) => {
  if (shouldIgnoreBaileysInboundMessage(message)) {
    return null;
  }

  const remoteJid = message.key.remoteJid;
  const text = extractBaileysText(message);

  return {
    provider: WHATSAPP_PROVIDER_NAMES.BAILEYS,
    normalized: true,
    eventType: 'message.received',
    messageId: message.key?.id ?? null,
    remoteJid,
    // Use participant only when it is a non-empty value; newer WhatsApp/LID direct
    // messages set `participant` to '' which must fall back to remoteJid (|| not ??).
    senderJid: message.key?.participant || remoteJid,
    pushName: message.pushName ?? null,
    text,
    timestamp: message.messageTimestamp ?? null,
    safe: {
      from: maskBaileysJid(remoteJid),
      textPreview: text.slice(0, 80),
    },
  };
};

export const renderTerminalPairingCode = ({ pairingCode } = {}) => {
  if (!pairingCode) {
    return;
  }

  console.log('Phase 5 WhatsApp pairing code is ready.');
  console.log('Enter this code only on POC-WhatsApp-01.');
  console.log('Do not copy, screenshot, paste or store this pairing code.');
  console.log(`Pairing code: ${pairingCode}`);
};

const summarizePairingCodeError = (error) => ({
  name: error?.name,
  message: error?.message,
  code: error?.code,
  statusCode: error?.output?.statusCode,
});

export const createBaileysProvider = ({
  loadPackage = loadBaileysPackage,
  createAuthState = createEncryptedBaileysAuthState,
  renderQr = renderTerminalQr,
  renderPairingCode = renderTerminalPairingCode,
  logger = console,
} = {}) =>
  assertWhatsAppProvider({
    name: WHATSAPP_PROVIDER_NAMES.BAILEYS,

    async createSession(sessionInput = {}) {
      const baileysPackage = await loadPackage();
      const makeWASocket = resolveMakeWASocket(baileysPackage);

      if (typeof makeWASocket !== 'function') {
        throw new WhatsAppProviderNotReadyError('Baileys makeWASocket export is unavailable.');
      }

      const authState = await createAuthState({
        organizationId: sessionInput.organizationId,
        whatsappAccountId: sessionInput.whatsappAccountId,
        initAuthCreds: baileysPackage.initAuthCreds,
        proto: baileysPackage.proto,
      });

      const socket = makeWASocket({
        auth: authState.state,
        browser: ['WAM CRM AI', 'Chrome', '1.0.0'],
        markOnlineOnConnect: false,
        logger: createSafeBaileysLogger(),
        syncFullHistory: false,
        ...(sessionInput.socketOptions ?? {}),
      });

      socket.ev.on('creds.update', authState.saveCreds);

      let pairingCodeRequested = false;

      const requestPairingCodeSafely = async () => {
        if (!sessionInput.pairingPhoneNumber || pairingCodeRequested) {
          return;
        }

        pairingCodeRequested = true;

        if (typeof socket.requestPairingCode !== 'function') {
          const errorSummary = {
            name: 'WhatsAppProviderNotReadyError',
            message: 'Baileys requestPairingCode export is unavailable.',
            code: 'PAIRING_CODE_UNAVAILABLE',
            statusCode: undefined,
          };

          await safeCall({
            callback: sessionInput.onPairingCodeError,
            logger,
            label: 'Baileys pairing-code unavailable callback',
            value: {
              provider: WHATSAPP_PROVIDER_NAMES.BAILEYS,
              pairingCodeAvailable: false,
              error: errorSummary,
            },
          });

          return;
        }

        // WhatsApp rejects a pairing-code request (HTTP 428, "Connection Closed") if it is
        // issued before the socket has actually established its link. Wait a moment first.
        const delayMs = Number(sessionInput.pairingCodeRequestDelayMs ?? 0);
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }

        try {
          const pairingCode = await socket.requestPairingCode(
            sanitizePairingPhoneNumber(sessionInput.pairingPhoneNumber),
          );

          renderPairingCode({
            pairingCode,
          });

          await safeCall({
            callback: sessionInput.onPairingCode,
            logger,
            label: 'Baileys pairing-code callback',
            value: {
              provider: WHATSAPP_PROVIDER_NAMES.BAILEYS,
              pairingCodeAvailable: true,
              pairingCode,
            },
          });
        } catch (error) {
          const errorSummary = summarizePairingCodeError(error);

          logger?.error?.('Baileys pairing-code request failed safely.', errorSummary);

          await safeCall({
            callback: sessionInput.onPairingCodeError,
            logger,
            label: 'Baileys pairing-code error callback',
            value: {
              provider: WHATSAPP_PROVIDER_NAMES.BAILEYS,
              pairingCodeAvailable: false,
              error: errorSummary,
            },
          });
        }
      };

      socket.ev.on('connection.update', (connectionUpdate) => {
        if (connectionUpdate.qr && !sessionInput.pairingPhoneNumber) {
          renderQr({
            qr: connectionUpdate.qr,
            qrOutput: sessionInput.qrOutput,
          });

          safeCall({
            callback: sessionInput.onQr,
            logger,
            label: 'Baileys QR callback',
            value: {
              provider: WHATSAPP_PROVIDER_NAMES.BAILEYS,
              qrAvailable: true,
            },
          });
        }

        safeCall({
          callback: sessionInput.onConnectionUpdate,
          logger,
          label: 'Baileys connection update callback',
          value: connectionUpdate,
        });

        // A QR event means WhatsApp is ready to link — the right moment to request a pairing
        // code (adapts to the connection speed, unlike firing on the early "connecting" event).
        if (connectionUpdate.qr) {
          void requestPairingCodeSafely();
        }
      });

      socket.ev.on('messages.upsert', async (messageUpdate = {}) => {
        const inboundMessages = (messageUpdate.messages ?? [])
          .map((message) => normalizeBaileysInboundMessage(message))
          .filter(Boolean);

        for (const inboundMessage of inboundMessages) {
          // `@lid` senders carry no phone in the JID. Resolve it here, where the socket (and so
          // the LID mapping store) is in scope, and hand it to ingestion as a separate field.
          const senderPhoneJid = await resolveLidPhoneJid({
            socket,
            jid: inboundMessage.senderJid,
          });

          await safeCall({
            callback: sessionInput.onInboundMessage,
            logger,
            label: 'Baileys inbound message callback',
            value: senderPhoneJid ? { ...inboundMessage, senderPhoneJid } : inboundMessage,
          });
        }
      });

      return {
        provider: WHATSAPP_PROVIDER_NAMES.BAILEYS,
        socket,
        createdAt: new Date(),
        async close() {
          socket.end?.();
          socket.ws?.close?.();
        },
      };
    },

    async destroySession(sessionHandle = {}) {
      await sessionHandle.close?.();

      return {
        provider: WHATSAPP_PROVIDER_NAMES.BAILEYS,
        destroyed: true,
      };
    },

    async sendTextMessage(messageInput = {}) {
      const socket = messageInput.sessionHandle?.socket ?? messageInput.socket;

      if (!socket || typeof socket.sendMessage !== 'function') {
        throw new WhatsAppProviderNotReadyError('Baileys socket is not ready for sending.');
      }

      const text = String(messageInput.text ?? messageInput.message ?? '').trim();

      if (!text) {
        throw new WhatsAppProviderNotReadyError('Baileys text message is required.');
      }

      const recipientJid = resolveDirectMessageJid(messageInput.to ?? messageInput.recipientJid);
      const sendResult = await socket.sendMessage(recipientJid, {
        text,
      });

      return {
        provider: WHATSAPP_PROVIDER_NAMES.BAILEYS,
        sent: true,
        recipientType: recipientJid.endsWith('@g.us') ? 'group' : 'direct',
        providerMessageId: sendResult?.key?.id ?? null,
      };
    },

    normalizeEvent(providerEvent = {}) {
      return {
        provider: WHATSAPP_PROVIDER_NAMES.BAILEYS,
        normalized: false,
        eventType: providerEvent.type ?? 'unknown',
      };
    },

    getConnectionStatus() {
      return {
        provider: WHATSAPP_PROVIDER_NAMES.BAILEYS,
        status: 'not_started',
      };
    },
  });
