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

const notImplementedYet = (operationName) =>
  new WhatsAppProviderNotReadyError(
    `${operationName} will be implemented after the Phase 5 single-session receive/send proof is ready.`,
  );

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

      socket.ev.on('connection.update', (connectionUpdate) => {
        if (connectionUpdate.qr) {
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
      });

      let pairingCodeTimer = null;

      if (sessionInput.pairingPhoneNumber) {
        if (typeof socket.requestPairingCode !== 'function') {
          throw new WhatsAppProviderNotReadyError(
            'Baileys requestPairingCode export is unavailable.',
          );
        }

        const requestPairingCodeSafely = async () => {
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

        pairingCodeTimer = setTimeout(
          requestPairingCodeSafely,
          sessionInput.pairingCodeRequestDelayMs ?? 5000,
        );
      }

      return {
        provider: WHATSAPP_PROVIDER_NAMES.BAILEYS,
        socket,
        createdAt: new Date(),
        async close() {
          if (pairingCodeTimer) {
            clearTimeout(pairingCodeTimer);
          }

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
      void messageInput;
      throw notImplementedYet('Baileys text sending');
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
