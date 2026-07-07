import { InvalidWhatsAppProviderError } from '../whatsapp.errors.js';

export const WHATSAPP_PROVIDER_NAMES = Object.freeze({
  BAILEYS: 'baileys',
});

export const WHATSAPP_PROVIDER_METHODS = Object.freeze([
  'createSession',
  'destroySession',
  'sendTextMessage',
  'normalizeEvent',
  'getConnectionStatus',
]);

export const assertWhatsAppProvider = (provider) => {
  if (!provider || typeof provider !== 'object') {
    throw new InvalidWhatsAppProviderError('Provider must be an object.');
  }

  if (!provider.name || typeof provider.name !== 'string') {
    throw new InvalidWhatsAppProviderError('Provider must expose a name.');
  }

  const missingMethods = WHATSAPP_PROVIDER_METHODS.filter(
    (methodName) => typeof provider[methodName] !== 'function',
  );

  if (missingMethods.length > 0) {
    throw new InvalidWhatsAppProviderError(
      `Provider is missing methods: ${missingMethods.join(', ')}`,
    );
  }

  return provider;
};
