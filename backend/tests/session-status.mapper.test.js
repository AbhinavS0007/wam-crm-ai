import { describe, expect, it } from 'vitest';

import { ACCOUNT_STATUSES } from '../src/constants/account-statuses.js';
import { mapBaileysConnectionUpdateToAccountStatus } from '../src/modules/whatsapp/sessions/session-status.mapper.js';

describe('Phase 5 session status mapper', () => {
  it('maps QR and connecting updates to connecting status', () => {
    expect(
      mapBaileysConnectionUpdateToAccountStatus({
        qr: 'CANARY_PHASE5_QR_SHOULD_NOT_LEAK',
      }),
    ).toMatchObject({
      status: ACCOUNT_STATUSES.CONNECTING,
      qrAvailable: true,
    });

    expect(
      mapBaileysConnectionUpdateToAccountStatus({
        connection: 'connecting',
      }),
    ).toMatchObject({
      status: ACCOUNT_STATUSES.CONNECTING,
      qrAvailable: false,
    });
  });

  it('maps open connection to active status', () => {
    expect(
      mapBaileysConnectionUpdateToAccountStatus({
        connection: 'open',
      }),
    ).toMatchObject({
      status: ACCOUNT_STATUSES.ACTIVE,
      disconnectCode: null,
      disconnectReason: null,
    });
  });

  it('maps logged-out close to disconnected status', () => {
    expect(
      mapBaileysConnectionUpdateToAccountStatus({
        connection: 'close',
        lastDisconnect: {
          error: {
            output: {
              statusCode: 401,
            },
          },
        },
      }),
    ).toMatchObject({
      status: ACCOUNT_STATUSES.DISCONNECTED,
      disconnectCode: 'phone_side_logout',
    });
  });

  it('maps temporary close to reconnecting status with safe reason', () => {
    expect(
      mapBaileysConnectionUpdateToAccountStatus({
        connection: 'close',
        lastDisconnect: {
          error: {
            message: 'network timeout while connecting',
          },
        },
      }),
    ).toMatchObject({
      status: ACCOUNT_STATUSES.RECONNECTING,
      disconnectCode: 'temporary_provider_disconnect',
      disconnectReason: 'network timeout while connecting',
    });
  });
});
