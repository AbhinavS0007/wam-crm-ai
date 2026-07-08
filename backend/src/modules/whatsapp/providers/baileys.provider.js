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

const notImplementedYet = (operationName) =>
  new WhatsAppProviderNotReadyError(
    `${operationName} will be implemented after the Phase 5 single-session receive/send proof is ready.`,
  );

export const createBaileysProvider = ({
  loadPackage = loadBaileysPackage,
  createAuthState = createEncryptedBaileysAuthState,
  renderQr = renderTerminalQr,
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
