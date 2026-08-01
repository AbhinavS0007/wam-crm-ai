import { InvalidAiProviderError } from './ai.errors.js';

export const AI_PROVIDER_NAMES = Object.freeze({
  ANTHROPIC: 'anthropic',
  GROK: 'grok',
  GROQ: 'groq',
});

export const AI_PROVIDER_METHODS = Object.freeze(['generateReplyDraft']);

export const assertAiProvider = (provider) => {
  if (!provider || typeof provider !== 'object') {
    throw new InvalidAiProviderError('Provider must be an object.');
  }

  if (!provider.name || typeof provider.name !== 'string') {
    throw new InvalidAiProviderError('Provider must expose a name.');
  }

  const missingMethods = AI_PROVIDER_METHODS.filter(
    (methodName) => typeof provider[methodName] !== 'function',
  );

  if (missingMethods.length > 0) {
    throw new InvalidAiProviderError(`Provider is missing methods: ${missingMethods.join(', ')}`);
  }

  return provider;
};
