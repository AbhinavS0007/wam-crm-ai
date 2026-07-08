import { describe, expect, it } from 'vitest';

import {
  BAILEYS_AUTH_PAYLOAD_TYPES,
  BAILEYS_CREDS_KEY_ID,
  deserializeBaileysAuthPayload,
  hydrateBaileysKeyValue,
  serializeBaileysAuthPayload,
  toBaileysCredsStorageKey,
  toBaileysKeyStorageKey,
} from '../src/modules/whatsapp/auth-state/baileys-auth-state.mapper.js';
import { WhatsAppProviderError } from '../src/modules/whatsapp/whatsapp.errors.js';
import { WHATSAPP_AUTH_STATE_NAMESPACES } from '../src/modules/whatsapp-auth-states/whatsapp-auth-state.model.js';

describe('Baileys auth-state mapper', () => {
  it('maps Baileys creds and key values to encrypted auth-state storage keys', () => {
    expect(toBaileysCredsStorageKey()).toEqual({
      namespace: WHATSAPP_AUTH_STATE_NAMESPACES.CREDS,
      keyId: BAILEYS_CREDS_KEY_ID,
    });

    expect(
      toBaileysKeyStorageKey({
        type: 'session',
        id: 'abc',
      }),
    ).toEqual({
      namespace: WHATSAPP_AUTH_STATE_NAMESPACES.KEYS,
      keyId: 'session:abc',
    });
  });

  it('rejects empty key type or key id', () => {
    expect(() =>
      toBaileysKeyStorageKey({
        type: '',
        id: 'abc',
      }),
    ).toThrow(WhatsAppProviderError);

    expect(() =>
      toBaileysKeyStorageKey({
        type: 'session',
        id: '',
      }),
    ).toThrow(WhatsAppProviderError);
  });

  it('serializes and deserializes Buffer, Uint8Array and Date values safely', () => {
    const original = {
      buffer: Buffer.from('CANARY_PHASE5_AUTH_STATE_SHOULD_NOT_LEAK'),
      bytes: new Uint8Array([1, 2, 3, 4]),
      createdAt: new Date('2026-07-07T10:00:00.000Z'),
      nested: {
        value: 'safe-value',
      },
    };

    const serialized = serializeBaileysAuthPayload(original);

    expect(serialized.buffer.__type).toBe(BAILEYS_AUTH_PAYLOAD_TYPES.BUFFER);
    expect(serialized.bytes.__type).toBe(BAILEYS_AUTH_PAYLOAD_TYPES.BUFFER);
    expect(serialized.createdAt.__type).toBe(BAILEYS_AUTH_PAYLOAD_TYPES.DATE);

    const deserialized = deserializeBaileysAuthPayload(serialized);

    expect(Buffer.isBuffer(deserialized.buffer)).toBe(true);
    expect(deserialized.buffer.toString('utf8')).toBe('CANARY_PHASE5_AUTH_STATE_SHOULD_NOT_LEAK');
    expect(Buffer.isBuffer(deserialized.bytes)).toBe(true);
    expect([...deserialized.bytes]).toEqual([1, 2, 3, 4]);
    expect(deserialized.createdAt.toISOString()).toBe('2026-07-07T10:00:00.000Z');
    expect(deserialized.nested.value).toBe('safe-value');
  });

  it('hydrates app-state-sync-key values when Baileys proto is supplied', () => {
    const hydratedValue = {
      hydrated: true,
    };

    const proto = {
      Message: {
        AppStateSyncKeyData: {
          fromObject(value) {
            return {
              ...hydratedValue,
              value,
            };
          },
        },
      },
    };

    expect(
      hydrateBaileysKeyValue({
        type: 'app-state-sync-key',
        value: {
          keyData: Buffer.from('abc'),
        },
        proto,
      }),
    ).toEqual({
      ...hydratedValue,
      value: {
        keyData: Buffer.from('abc'),
      },
    });
  });
});
