import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import express from 'express';
import pino from 'pino';
import qrcode from 'qrcode';

const app = express();
app.use(express.json());

const PORT = Number(process.env.PHASE5_LOCAL_POC_PORT ?? 3001);
const AUTH_DIR = process.env.PHASE5_LOCAL_AUTH_DIR ?? '.phase5-local-auth';

let sock = null;
let latestQR = null;
let connectionStatus = 'starting';
let lastSafeEventAt = null;

const maskJid = (jid = '') => {
  if (!jid || typeof jid !== 'string') return 'unknown';

  const [left, domain] = jid.split('@');
  const visibleStart = left.slice(0, 3);
  const visibleEnd = left.slice(-3);

  return `${visibleStart}***${visibleEnd}@${domain ?? 'unknown'}`;
};

const getTextMessage = (msg) =>
  msg?.message?.conversation ||
  msg?.message?.extendedTextMessage?.text ||
  msg?.message?.imageMessage?.caption ||
  msg?.message?.videoMessage?.caption ||
  '';

async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: ['WAM CRM AI Local POC', 'Chrome', '1.0.0'],
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    lastSafeEventAt = new Date().toISOString();

    if (qr) {
      latestQR = qr;
      connectionStatus = 'qr_ready';
      console.log('New QR generated. Open http://localhost:3001/qr');
    }

    if (connection === 'close') {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      latestQR = null;
      connectionStatus = shouldReconnect ? 'reconnecting' : 'logged_out';

      console.log('Connection closed safely:', {
        shouldReconnect,
        statusCode,
      });

      if (shouldReconnect) {
        setTimeout(() => {
          startWhatsApp().catch((error) => {
            console.error('Reconnect failed safely:', {
              name: error?.name,
              message: error?.message,
            });
          });
        }, 1500);
      }
    }

    if (connection === 'open') {
      latestQR = null;
      connectionStatus = 'connected';
      console.log('✅ WhatsApp connected with local Baileys POC.');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages?.[0];

    if (!msg?.message || msg.key?.fromMe) return;

    const from = msg.key.remoteJid;

    if (!from || from.endsWith('@g.us') || from === 'status@broadcast') return;

    const text = getTextMessage(msg);

    console.log('📩 Direct message received safely:', {
      from: maskJid(from),
      textPreview: text.slice(0, 80),
    });
  });
}

app.get('/status', (req, res) => {
  res.json({
    status: connectionStatus,
    hasQr: Boolean(latestQR),
    lastSafeEventAt,
    authDir: AUTH_DIR,
  });
});

app.get('/qr', async (req, res) => {
  if (!latestQR) {
    return res.send(`
      <html>
        <body style="font-family: Arial; padding: 24px;">
          <h2>No QR available</h2>
          <p>Status: ${connectionStatus}</p>
          <p>If status is connected, WhatsApp is already linked.</p>
          <p>If status is starting/reconnecting, refresh after 3 seconds.</p>
        </body>
      </html>
    `);
  }

  const qrImage = await qrcode.toDataURL(latestQR);

  res.send(`
    <html>
      <body style="font-family: Arial; padding: 24px;">
        <h2>Phase 5 Local WhatsApp POC QR</h2>
        <p>Scan only with the disposable POC WhatsApp account.</p>
        <p>Do not screenshot or share this QR.</p>
        <img src="${qrImage}" style="width: 320px; height: 320px;" />
      </body>
    </html>
  `);
});

app.post('/send', async (req, res) => {
  const { to, message } = req.body ?? {};

  if (!to || !message) {
    return res.status(400).json({
      success: false,
      error: "Both 'to' and 'message' are required.",
    });
  }

  if (connectionStatus !== 'connected' || !sock) {
    return res.status(409).json({
      success: false,
      error: 'WhatsApp is not connected yet.',
    });
  }

  const normalizedTo = String(to)
    .replace(/^\+/, '')
    .replace(/[\s()-]/g, '');

  if (!/^\d{8,15}$/.test(normalizedTo)) {
    return res.status(400).json({
      success: false,
      error: 'Use digits only with country code, no plus sign.',
    });
  }

  try {
    await sock.sendMessage(`${normalizedTo}@s.whatsapp.net`, {
      text: String(message),
    });

    res.json({
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error?.message ?? 'Send failed.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`WhatsApp local POC running on http://localhost:${PORT}`);
  console.log(`QR page: http://localhost:${PORT}/qr`);
  console.log(`Status: http://localhost:${PORT}/status`);
  console.log(`Local auth folder: ${AUTH_DIR}`);
});

startWhatsApp().catch((error) => {
  console.error('Local Baileys POC failed safely:', {
    name: error?.name,
    message: error?.message,
  });
  process.exitCode = 1;
});
