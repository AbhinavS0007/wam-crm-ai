import { assertWhatsAppProvider, WHATSAPP_PROVIDER_NAMES } from './whatsapp-provider.interface.js';
import { WhatsAppProviderNotReadyError } from '../whatsapp.errors.js';

export const BAILEYS_IMPORT_TARGET = '@whiskeysockets/baileys';

export const loadBaileysPackage = () => import(BAILEYS_IMPORT_TARGET);

const notImplementedYet = (operationName) =>
  new WhatsAppProviderNotReadyError(
    `${operationName} will be implemented after the encrypted auth-state adapter and single-session service are ready.`,
  );

export const createBaileysProvider = () =>
  assertWhatsAppProvider({
    name: WHATSAPP_PROVIDER_NAMES.BAILEYS,

    async createSession(sessionInput = {}) {
      void sessionInput;
      await loadBaileysPackage();
      throw notImplementedYet('Baileys session creation');
    },

    async destroySession(sessionHandle = {}) {
      void sessionHandle;

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
