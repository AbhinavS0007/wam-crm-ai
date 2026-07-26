import { describe, expect, it, vi } from 'vitest';

import { ACCOUNT_STATUSES } from '../src/constants/account-statuses.js';
import { createDeliveryRunner } from '../src/modules/whatsapp/delivery/delivery-runner.js';

const enabledConfig = {
  WHATSAPP_ENABLED: true,
  WHATSAPP_SEND_TEXT_POC_ENABLED: true,
  WHATSAPP_OUTBOUND_DELIVERY_ENABLED: true,
};

describe('WhatsApp delivery runner', () => {
  it('drains active accounts whose runtime state carries organizationId', async () => {
    const sessionManager = {
      listRuntimeStates: vi.fn(() => [
        {
          running: true,
          status: ACCOUNT_STATUSES.ACTIVE,
          accountId: 'acc-1',
          organizationId: 'org-1',
        },
      ]),
      sendTextMessage: vi.fn(async () => ({ sent: true })),
    };

    const drainQueue = vi.fn(async () => ({ drained: 0 }));
    const runner = createDeliveryRunner({
      config: enabledConfig,
      sessionManager,
      createDeliveryService: () => ({ drainQueue }),
    });

    await runner.drainActiveAccounts();

    expect(drainQueue).toHaveBeenCalledWith({
      organizationId: 'org-1',
      whatsappAccountId: 'acc-1',
    });
  });

  it('skips accounts missing organizationId (guards the delivery regression)', async () => {
    const sessionManager = {
      listRuntimeStates: vi.fn(() => [
        {
          running: true,
          status: ACCOUNT_STATUSES.ACTIVE,
          accountId: 'acc-1',
          organizationId: undefined,
        },
      ]),
      sendTextMessage: vi.fn(),
    };

    const drainQueue = vi.fn(async () => ({ drained: 0 }));
    const runner = createDeliveryRunner({
      config: enabledConfig,
      sessionManager,
      createDeliveryService: () => ({ drainQueue }),
    });

    await runner.drainActiveAccounts();

    expect(drainQueue).not.toHaveBeenCalled();
  });

  it('does not drain non-active sessions', async () => {
    const sessionManager = {
      listRuntimeStates: vi.fn(() => [
        {
          running: true,
          status: ACCOUNT_STATUSES.CONNECTING,
          accountId: 'acc-1',
          organizationId: 'org-1',
        },
      ]),
      sendTextMessage: vi.fn(),
    };

    const drainQueue = vi.fn(async () => ({ drained: 0 }));
    const runner = createDeliveryRunner({
      config: enabledConfig,
      sessionManager,
      createDeliveryService: () => ({ drainQueue }),
    });

    await runner.drainActiveAccounts();

    expect(drainQueue).not.toHaveBeenCalled();
  });
});
