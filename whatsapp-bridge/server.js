const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
const PORT = process.env.BRIDGE_PORT || 3001;
const BACKEND_URL = process.env.BACKEND_URL || 'https://whatsapp-backend-e802.onrender.com';

let currentQR = null;
let connectionStatus = 'initializing';
let connectedUser = null;
let sock = null;

// FAQ Engine for Radial Code
function getBotReply(customerName, incomingText) {
  const query = (incomingText || '').toLowerCase().trim();

  if (query.includes('hi') || query.includes('hello') || query.includes('hey') || query === 'start' || query === 'menu') {
    return `👋 *Hello ${customerName || 'Valued Customer'}!*\n\nWelcome to *Radial Code Support* 🚀\nWe provide modern web development, mobile apps, and industry-ready tech training.\n\n*How can we help you today?*\n1️⃣ Reply *1* or *Services* - View Software & Web Services\n2️⃣ Reply *2* or *Courses* - View Training & Certification Courses\n3️⃣ Reply *3* or *Contact* - Get Address, Phone & Support Email\n4️⃣ Reply *4* or *Careers* - Current Job & Internship Openings\n\n_Type any keyword or number to continue._`;
  } else if (query.includes('1') || query.includes('service')) {
    return `🛠️ *Radial Code - Our Core Services:*\n\n1. *Custom Web Development:* Next.js, React, Node.js, Rust microservices.\n2. *Mobile App Development:* Android & iOS apps with Flutter & React Native.\n3. *UI/UX Design:* Figma prototypes and modern user experiences.\n4. *Cloud & DevOps:* AWS, Docker, Kubernetes & CI/CD deployment automation.\n5. *AI & Automation:* WhatsApp bots, conversational AI, and internal workflow automation.\n\n💬 Reply with *Contact* to get a free project quotation!`;
  } else if (query.includes('2') || query.includes('course') || query.includes('learn') || query.includes('training')) {
    return `🎓 *Radial Code - Tech Training & Certifications:*\n\n• *Full-Stack Web Development:* React, Next.js, Node.js, PostgreSQL (Duration: 4 Months)\n• *Python, AI & Data Science:* Python, Pandas, Machine Learning & LLM APIs (Duration: 3 Months)\n• *Mobile App Development:* Flutter & Native integrations (Duration: 3 Months)\n• *Cloud & DevOps Essentials:* Docker, Linux, CI/CD pipelines & AWS (Duration: 2 Months)\n\n📌 *Key Highlights:* Live projects, 1-on-1 mentorship, and placement assistance.\n💬 Reply with *Contact* to talk with our career counsellor!`;
  } else if (query.includes('3') || query.includes('contact') || query.includes('call') || query.includes('address') || query.includes('support')) {
    return `📞 *Radial Code - Contact Information:*\n\n📍 *Office:* Tech Park, Phase 1, Sector 62\n📧 *Email:* contact@radialcode.com\n🌐 *Website:* https://radialcode.com\n⏰ *Working Hours:* Monday – Friday: 9:00 AM – 6:00 PM IST\n\nAn agent will also connect with you here shortly if you need personal assistance!`;
  } else if (query.includes('4') || query.includes('career') || query.includes('job') || query.includes('intern')) {
    return `💼 *Careers at Radial Code:*\n\nWe are actively hiring:\n• Junior / Senior Full-Stack Developers (React / Node / Rust)\n• UI/UX Designers\n• Technical Interns (Frontend & Backend)\n\n📧 Send your CV/Portfolio to: *careers@radialcode.com*\nSubject format: _Job Application - [Your Role]_`;
  } else {
    return `Thank you for contacting Radial Code! 😊\n\nI couldn't quite find an exact answer for \"${incomingText}\".\n\n*Quick Navigation:*\n• Reply *1* for *Services*\n• Reply *2* for *Courses*\n• Reply *3* for *Contact Info*\n\nOur support team has been notified and an agent will reply to you here shortly.`;
  }
}

// Forward to Render Backend so Neon PostgreSQL & Next.js Live Chat Dashboard stay updated
async function syncToBackend(senderNumber, customerName, incomingText, replyText) {
  try {
    const payload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'qr_bridge_entry',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: connectedUser || 'bridge',
                  phone_number_id: 'bridge_qr'
                },
                contacts: [
                  {
                    profile: { name: customerName || 'WhatsApp Customer' },
                    wa_id: senderNumber
                  }
                ],
                messages: [
                  {
                    from: senderNumber,
                    id: `bridge_${Date.now()}`,
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    text: { body: incomingText },
                    type: 'text'
                  }
                ]
              },
              field: 'messages'
            }
          ]
        }
      ]
    };

    fetch(`${BACKEND_URL}/webhooks/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(err => {
      // Backend sync error silently ignored
    });
  } catch (e) {
    // ignore
  }
}

// Initialize Baileys WhatsApp Connection
async function startWhatsAppBridge() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`Using WhatsApp Web v${version.join('.')}, isLatest: ${isLatest}`);

  sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state,
    browser: ['Radial Code WhatsApp Bot', 'Chrome', '1.0.0']
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQR = qr;
      connectionStatus = 'scan_needed';
      console.log('\n======================================================');
      console.log('📱 SCAN THIS QR CODE IN WHATSAPP (Linked Devices):');
      console.log('======================================================\n');
      qrcodeTerminal.generate(qr, { small: true });
      console.log('\n👉 Or open in browser: http://localhost:' + PORT);
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
      console.log(`Connection closed (status: ${statusCode}). Logged out: ${isLoggedOut}`);
      connectionStatus = 'disconnected';
      currentQR = null;
      connectedUser = null;

      if (isLoggedOut) {
        console.log('Session invalidated or logged out. Resetting auth credentials...');
        try {
          fs.rmSync(path.join(__dirname, 'auth_info_baileys'), { recursive: true, force: true });
        } catch (e) {}
        setTimeout(startWhatsAppBridge, 1000);
      } else {
        setTimeout(startWhatsAppBridge, 3000);
      }
    } else if (connection === 'open') {
      connectionStatus = 'connected';
      currentQR = null;
      connectedUser = sock.user?.id ? sock.user.id.split(':')[0] : 'Unknown';
      console.log('\n======================================================');
      console.log(`🎉 WHATSAPP CONNECTED! Phone Number: ${connectedUser}`);
      console.log('Radial Code Bot is now LIVE on real WhatsApp!');
      console.log('======================================================\n');
    }
  });

  // Handle Inbound WhatsApp Messages
  sock.ev.on('messages.upsert', async (m) => {
    try {
      if (m.type !== 'notify') return;

      for (const msg of m.messages) {
        // Ignore messages sent by bot itself
        if (msg.key.fromMe) continue;

        // Ignore group chats
        if (msg.key.remoteJid.endsWith('@g.us')) continue;

        let remoteJid = msg.key.remoteJid;
        
        // WhatsApp LID Fix: If remoteJid is an internal LID (e.g. @lid), extract the real phone number
        let phoneJid = remoteJid;
        if (remoteJid.endsWith('@lid')) {
          if (msg.key.remoteJidAlt && msg.key.remoteJidAlt.endsWith('@s.whatsapp.net')) {
            phoneJid = msg.key.remoteJidAlt;
          } else if (msg.key.participant && msg.key.participant.endsWith('@s.whatsapp.net')) {
            phoneJid = msg.key.participant;
          } else if (msg.key.participantAlt && msg.key.participantAlt.endsWith('@s.whatsapp.net')) {
            phoneJid = msg.key.participantAlt;
          }
        }

        const senderNumber = phoneJid.replace('@s.whatsapp.net', '').replace('@lid', '').replace(/[^0-9]/g, '');
        const customerName = msg.pushName || 'Customer';

        // Extract message text
        const text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.buttonsResponseMessage?.selectedButtonId ||
          msg.message?.templateButtonReplyMessage?.selectedId ||
          '';

        if (!text) continue;

        console.log(`\n📩 Inbound message from ${customerName} (${senderNumber}): "${text}"`);

        // Generate Bot Reply
        const reply = getBotReply(customerName, text);
        console.log(`🤖 Sending Auto-Reply to ${senderNumber}...`);

        // Send Reply via WhatsApp
        await sock.sendMessage(remoteJid, { text: reply });
        console.log(`✅ Reply delivered to ${senderNumber}!`);

        // Sync with Backend / Neon DB / Next.js Live Chat
        syncToBackend(senderNumber, customerName, text, reply);
      }
    } catch (err) {
      console.error('Error handling message:', err);
    }
  });
}

// JSON API for Next.js Dashboard to get QR Code and connection status
app.get('/api/status', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (connectionStatus === 'connected') {
    return res.json({
      status: 'connected',
      connectedUser: connectedUser,
      qr: null
    });
  }

  if (currentQR) {
    try {
      const qrDataUrl = await QRCode.toDataURL(currentQR, { width: 300 });
      return res.json({
        status: 'scan_needed',
        connectedUser: null,
        qr: qrDataUrl
      });
    } catch (e) {
      return res.status(500).json({ status: 'error', error: e.message });
    }
  }

  return res.json({
    status: 'initializing',
    connectedUser: null,
    qr: null
  });
});

// Web UI for scanning QR Code
app.get('/', async (req, res) => {
  if (connectionStatus === 'connected') {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Radial Code WhatsApp Bridge</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #1e293b; padding: 2.5rem; border-radius: 1rem; text-align: center; max-width: 420px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid #334155; }
          .badge { background: #10b981; color: #fff; padding: 0.5rem 1rem; border-radius: 9999px; font-weight: bold; display: inline-block; margin-bottom: 1.5rem; }
          h2 { margin: 0 0 1rem; font-size: 1.5rem; }
          p { color: #94a3b8; line-height: 1.6; margin: 0 0 1.5rem; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">● CONNECTED & LIVE</div>
          <h2>Radial Code WhatsApp Bot</h2>
          <p>Connected Phone: <strong>+${connectedUser}</strong></p>
          <p>The bot is currently listening and replying to all WhatsApp messages automatically.</p>
        </div>
      </body>
      </html>
    `);
  }

  if (currentQR) {
    try {
      const qrDataUrl = await QRCode.toDataURL(currentQR, { width: 320 });
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Scan WhatsApp QR Code</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta http-equiv="refresh" content="10">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #1e293b; padding: 2rem; border-radius: 1rem; text-align: center; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid #334155; }
            img { border-radius: 0.5rem; background: #fff; padding: 10px; margin: 1rem 0; width: 280px; height: 280px; }
            h2 { margin: 0 0 0.5rem; font-size: 1.3rem; }
            p { color: #94a3b8; font-size: 0.9rem; margin: 0.5rem 0; }
            .steps { text-align: left; background: #0f172a; padding: 1rem; border-radius: 0.5rem; font-size: 0.85rem; color: #cbd5e1; margin-top: 1rem; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Scan WhatsApp QR Code</h2>
            <p>Connect your WhatsApp to Radial Code Bot</p>
            <img src="${qrDataUrl}" alt="WhatsApp QR Code" />
            <div class="steps">
              1. Open <strong>WhatsApp</strong> on your phone.<br>
              2. Tap <strong>Linked Devices</strong> ➔ <strong>Link a device</strong>.<br>
              3. Point camera at this QR code.
            </div>
          </div>
        </body>
        </html>
      `);
    } catch (e) {
      return res.status(500).send('Error generating QR code image');
    }
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta http-equiv="refresh" content="2">
      <style>body { font-family: sans-serif; background: #0f172a; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; }</style>
    </head>
    <body>
      <h2>Starting WhatsApp Gateway... please wait 3 seconds.</h2>
    </body>
    </html>
  `);
});

// Outbound API for Agent Dashboard to send manual replies
app.post('/api/send', async (req, res) => {
  const { number, text } = req.body;
  if (!number || !text) {
    return res.status(400).json({ error: 'Missing number or text' });
  }

  if (connectionStatus !== 'connected' || !sock) {
    return res.status(503).json({ error: 'WhatsApp is not connected' });
  }

  try {
    const remoteJid = `${number.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
    await sock.sendMessage(remoteJid, { text });
    return res.json({ success: true, message: 'Message delivered via WhatsApp' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`WhatsApp Bridge Server running on http://localhost:${PORT}`);
  startWhatsAppBridge();
});

