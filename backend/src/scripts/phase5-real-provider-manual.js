import express from 'express';
import qrcode from 'qrcode';

import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { createBaileysProvider } from '../modules/whatsapp/providers/baileys.provider.js';
import { createSingleSessionService } from '../modules/whatsapp/sessions/single-session.service.js';

const app = express();
app.use(express.json());

const PORT = Number(process.env.PHASE5_REAL_PROVIDER_PORT ?? 3002);

let latestQr = null;
let lastQrAt = null;
let lastSafeInboundAt = null;
const safeInboundEvents = [];

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

const service = createSingleSessionService({
  provider,
});

let shuttingDown = false;

const getSafeStatus = () => ({
  service: service.inspectSingleSession(),
  hasQr: Boolean(latestQr),
  lastQrAt,
  lastSafeInboundAt,
  safeInboundCount: safeInboundEvents.length,
});

const shutdown = async (signal) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log(`${signal} received. Stopping Phase 5 real provider manual server safely.`);

  try {
    await service.stopSingleSession({
      disconnectCode: 'phase5_real_provider_manual_shutdown',
    });
  } finally {
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

const startResult = await service.startSingleSession({
  onInboundMessage: async (inboundMessage) => {
    lastSafeInboundAt = new Date().toISOString();

    const safeEvent = {
      receivedAt: lastSafeInboundAt,
      provider: inboundMessage.provider,
      eventType: inboundMessage.eventType,
      messageIdPresent: Boolean(inboundMessage.messageId),
      safe: inboundMessage.safe,
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
console.log(`Send endpoint: POST http://localhost:${PORT}/send`);
console.log('Use only disposable POC-WhatsApp-01.');
console.log('Do not paste QR, phone, full JID, auth payload or raw provider logs.');

app.listen(PORT, () => {
  console.log(`Phase 5 real provider manual server running on http://localhost:${PORT}`);
});
