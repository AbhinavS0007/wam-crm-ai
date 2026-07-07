import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertWhatsAppProvider,
  WHATSAPP_PROVIDER_METHODS,
  WHATSAPP_PROVIDER_NAMES,
} from '../src/modules/whatsapp/providers/whatsapp-provider.interface.js';
import {
  BAILEYS_IMPORT_TARGET,
  createBaileysProvider,
} from '../src/modules/whatsapp/providers/baileys.provider.js';
import { InvalidWhatsAppProviderError } from '../src/modules/whatsapp/whatsapp.errors.js';

const collectJavaScriptFiles = (directoryPath) => {
  const entries = fs.readdirSync(directoryPath, {
    withFileTypes: true,
  });

  return entries.flatMap((entry) => {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      return collectJavaScriptFiles(entryPath);
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      return [entryPath];
    }

    return [];
  });
};

describe('Phase 5 WhatsApp provider boundary', () => {
  it('defines the required provider methods before runtime session work starts', () => {
    expect(WHATSAPP_PROVIDER_METHODS).toEqual([
      'createSession',
      'destroySession',
      'sendTextMessage',
      'normalizeEvent',
      'getConnectionStatus',
    ]);
  });

  it('rejects invalid provider implementations', () => {
    expect(() =>
      assertWhatsAppProvider({
        name: WHATSAPP_PROVIDER_NAMES.BAILEYS,
        createSession: () => undefined,
      }),
    ).toThrow(InvalidWhatsAppProviderError);
  });

  it('creates a Baileys provider skeleton without starting a live WhatsApp session', async () => {
    const provider = createBaileysProvider();

    expect(provider.name).toBe(WHATSAPP_PROVIDER_NAMES.BAILEYS);
    expect(provider.getConnectionStatus()).toEqual({
      provider: WHATSAPP_PROVIDER_NAMES.BAILEYS,
      status: 'not_started',
    });

    await expect(provider.destroySession()).resolves.toEqual({
      provider: WHATSAPP_PROVIDER_NAMES.BAILEYS,
      destroyed: true,
    });

    expect(provider.normalizeEvent({ type: 'synthetic.phase5' })).toEqual({
      provider: WHATSAPP_PROVIDER_NAMES.BAILEYS,
      normalized: false,
      eventType: 'synthetic.phase5',
    });
  });

  it('keeps Baileys imports isolated to the Baileys provider adapter', () => {
    const sourceDirectory = path.resolve(process.cwd(), 'src');
    const sourceFiles = collectJavaScriptFiles(sourceDirectory);

    const offenders = sourceFiles.filter((filePath) => {
      const source = fs.readFileSync(filePath, 'utf8');
      const normalizedPath = filePath.split(path.sep).join('/');

      return (
        source.includes(BAILEYS_IMPORT_TARGET) &&
        !normalizedPath.endsWith('src/modules/whatsapp/providers/baileys.provider.js')
      );
    });

    expect(offenders).toEqual([]);
  });
});
