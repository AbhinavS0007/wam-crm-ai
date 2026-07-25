import express from 'express';
import qrcode from 'qrcode';

import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { connectRedis, disconnectRedis } from '../config/redis.js';
import { env } from '../config/env.js';
import { createOutboundDeliveryService } from '../modules/whatsapp/delivery/outbound-delivery.service.js';
import { createInboundMessageIngestionService } from '../modules/whatsapp/ingestion/inbound-message.service.js';
import { createBaileysProvider } from '../modules/whatsapp/providers/baileys.provider.js';
import { createSingleSessionService } from '../modules/whatsapp/sessions/single-session.service.js';

const app = express();
app.use(express.json());

const PORT = Number(process.env.PHASE5_REAL_PROVIDER_PORT ?? 3002);

let latestQr = null;
let lastQrAt = null;
let lastSafeInboundAt = null;
const safeInboundEvents = [];

const persistInboundEnabled = env.WHATSAPP_PERSIST_INBOUND_ENABLED === true;
const persistenceCounters = {
  persisted: 0,
  duplicate: 0,
  ignored: 0,
  notPersisted: 0,
};

const provider = createBaileysProvider({
  renderQr: ({ qr }) => {
    if (!qr) {
      return;
    }

    latestQr = qr;
    lastQrAt = new Date().toISOString();

    console.log(`Phase 5 real provider QR ready. Open http://localhost:${PORT}/qr`);
    console.log('Scan only with POC-WhatsApp-01. Do not paste QR, phone, JID or auth payload.');
  },
});

const inboundMessageService = persistInboundEnabled ? createInboundMessageIngestionService() : null;

const service = createSingleSessionService({
  provider,
  inboundMessageService,
});

const recordPersistenceOutcome = (ingestionResult) => {
  if (!ingestionResult) {
    persistenceCounters.notPersisted += 1;
    return;
  }

  if (ingestionResult.persisted) {
    persistenceCounters.persisted += 1;
  } else if (ingestionResult.duplicate) {
    persistenceCounters.duplicate += 1;
  } else if (ingestionResult.ignored) {
    persistenceCounters.ignored += 1;
  } else {
    persistenceCounters.notPersisted += 1;
  }
};

const outboundDeliveryEnabled = env.WHATSAPP_OUTBOUND_DELIVERY_ENABLED === true;
const deliveryCounters = {
  ticks: 0,
  delivered: 0,
  failed: 0,
};

const deliveryService = createOutboundDeliveryService({
  sessionService: service,
});

let deliveryTimer = null;
let deliveryTickRunning = false;

const runDeliveryTick = async () => {
  if (deliveryTickRunning) {
    return;
  }

  const runtime = service.inspectSingleSession();

  if (!runtime.running || !runtime.accountId || !runtime.organizationId) {
    return;
  }

  deliveryTickRunning = true;

  try {
    const result = await deliveryService.drainQueue({
      organizationId: runtime.organizationId,
      whatsappAccountId: runtime.accountId,
    });

    deliveryCounters.ticks += 1;
    deliveryCounters.delivered += result.delivered;
    deliveryCounters.failed += result.failed;

    if (result.delivered > 0 || result.failed > 0) {
      console.log('Phase 8 outbound delivery tick:', {
        delivered: result.delivered,
        failed: result.failed,
      });
    }
  } catch (error) {
    console.error('Phase 8 outbound delivery tick failed safely.', {
      code: error?.code,
      name: error?.name,
    });
  } finally {
    deliveryTickRunning = false;
  }
};

let shuttingDown = false;

const getSafeStatus = () => ({
  service: service.inspectSingleSession(),
  hasQr: Boolean(latestQr),
  lastQrAt,
  lastSafeInboundAt,
  safeInboundCount: safeInboundEvents.length,
  persistInboundEnabled,
  persistence: {
    ...persistenceCounters,
  },
  outboundDeliveryEnabled,
  delivery: {
    ...deliveryCounters,
  },
});

const shutdown = async (signal) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log(`${signal} received. Stopping Phase 5 real provider manual server safely.`);

  if (deliveryTimer) {
    clearInterval(deliveryTimer);
    deliveryTimer = null;
  }

  try {
    await service.stopSingleSession({
      disconnectCode: 'phase5_real_provider_manual_shutdown',
    });
  } finally {
    await disconnectRedis();
    await disconnectDatabase();
    process.exit(0);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

app.get('/status', (req, res) => {
  res.json(getSafeStatus());
});

app.get('/qr', async (req, res) => {
  if (!latestQr) {
    const status = getSafeStatus();

    return res.send(`
      <html>
        <body style="font-family: Arial; padding: 24px;">
          <h2>No QR available</h2>
          <p>Running: ${status.service.running}</p>
          <p>Provider: ${status.service.provider ?? 'not-started'}</p>
          <p>QR available: ${status.hasQr}</p>
          <p>If already connected, QR will not be shown.</p>
          <p>If starting, refresh after 3 seconds.</p>
        </body>
      </html>
    `);
  }

  const qrImage = await qrcode.toDataURL(latestQr);

  res.send(`
    <html>
      <body style="font-family: Arial; padding: 24px;">
        <h2>Phase 5 Real Provider QR</h2>
        <p>Scan only with disposable POC-WhatsApp-01.</p>
        <p>Do not screenshot, paste, or store this QR.</p>
        <img src="${qrImage}" style="width: 320px; height: 320px;" />
      </body>
    </html>
  `);
});

app.get('/inbound-safe', (req, res) => {
  res.json({
    count: safeInboundEvents.length,
    events: safeInboundEvents.slice(-10),
  });
});

app.get('/conversations-safe', (req, res) => {
  res.json({
    persistInboundEnabled,
    persistence: {
      ...persistenceCounters,
    },
  });
});

app.get('/outbound-safe', (req, res) => {
  res.json({
    outboundDeliveryEnabled,
    delivery: {
      ...deliveryCounters,
    },
  });
});

app.post('/send', async (req, res) => {
  const { to, message, text } = req.body ?? {};
  const finalText = message ?? text;

  if (!to || !finalText) {
    return res.status(400).json({
      success: false,
      error: "Both 'to' and 'message' are required.",
    });
  }

  try {
    const result = await service.sendTextMessage({
      to,
      text: finalText,
    });

    res.json({
      success: true,
      result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error?.message ?? 'Send failed safely.',
      code: error?.code,
    });
  }
});

await connectDatabase();
await connectRedis();

const startResult = await service.startSingleSession({
  onInboundMessage: async (inboundMessage, ingestionResult) => {
    lastSafeInboundAt = new Date().toISOString();

    recordPersistenceOutcome(ingestionResult);

    const safeEvent = {
      receivedAt: lastSafeInboundAt,
      provider: inboundMessage.provider,
      eventType: inboundMessage.eventType,
      messageIdPresent: Boolean(inboundMessage.messageId),
      safe: inboundMessage.safe,
      persistence: ingestionResult
        ? {
            persisted: Boolean(ingestionResult.persisted),
            duplicate: Boolean(ingestionResult.duplicate),
            leadId: ingestionResult.leadId ?? null,
          }
        : {
            persisted: false,
            duplicate: false,
            leadId: null,
          },
    };

    safeInboundEvents.push(safeEvent);

    if (safeInboundEvents.length > 20) {
      safeInboundEvents.shift();
    }

    console.log('Phase 5 real provider inbound received safely:', safeEvent);
  },
});

console.log('Phase 5 real provider manual server start requested.');
console.log('Safe runtime session:', startResult.session);
console.log(`Status endpoint: http://localhost:${PORT}/status`);
console.log(`QR endpoint: http://localhost:${PORT}/qr`);
console.log(`Safe inbound endpoint: http://localhost:${PORT}/inbound-safe`);
console.log(`Safe conversations endpoint: http://localhost:${PORT}/conversations-safe`);
console.log(`Send endpoint: POST http://localhost:${PORT}/send`);
console.log(
  persistInboundEnabled
    ? 'Phase 6 inbound persistence is ENABLED. Inbound messages will be stored in the CRM.'
    : 'Phase 6 inbound persistence is DISABLED. Set WHATSAPP_PERSIST_INBOUND_ENABLED=true to store.',
);

if (outboundDeliveryEnabled) {
  console.log(`Safe outbound endpoint: http://localhost:${PORT}/outbound-safe`);
  console.log(
    `Phase 8 outbound delivery is ENABLED. Draining queued messages every ${env.WHATSAPP_OUTBOUND_POLL_INTERVAL_MS}ms.`,
  );
  deliveryTimer = setInterval(() => {
    void runDeliveryTick();
  }, env.WHATSAPP_OUTBOUND_POLL_INTERVAL_MS);
} else {
  console.log(
    'Phase 8 outbound delivery is DISABLED. Set WHATSAPP_OUTBOUND_DELIVERY_ENABLED=true to deliver.',
  );
}

console.log('Use only disposable POC-WhatsApp-01.');
console.log('Do not paste QR, phone, full JID, auth payload or raw provider logs.');

app.listen(PORT, () => {
  console.log(`Phase 5 real provider manual server running on http://localhost:${PORT}`);
});
