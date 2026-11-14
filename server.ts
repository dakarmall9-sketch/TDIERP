import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FirebaseClientConfig {
  apiKey?: string;
  projectId?: string;
}

function loadFirebaseConfig(): FirebaseClientConfig {
  try {
    const cfgPath = path.resolve(__dirname, 'firebase-applet-config.json');
    const raw = fs.readFileSync(cfgPath, 'utf-8');
    return JSON.parse(raw) as FirebaseClientConfig;
  } catch {
    return {};
  }
}

function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function verifyFirebaseIdToken(idToken: string, apiKey: string): Promise<{ email?: string; uid?: string } | null> {
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { users?: Array<{ email?: string; localId?: string; emailVerified?: boolean }> };
    const user = data.users?.[0];
    if (!user || !user.emailVerified) return null;
    return { email: user.email, uid: user.localId };
  } catch {
    return null;
  }
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 3000);
  const firebaseCfg = loadFirebaseConfig();

  app.use(express.json({ limit: '2mb' }));

  // Health & SMTP Status
  app.get('/api/emails/status', (_req, res) => {
    res.json({ configured: isSmtpConfigured() });
  });

  // Real SMTP Email Dispatch Endpoint
  app.post('/api/emails/send', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    if (!token) {
      res.status(401).json({ error: 'Jeton d’authentification Firebase requis.' });
      return;
    }

    if (firebaseCfg.apiKey) {
      const verified = await verifyFirebaseIdToken(token, firebaseCfg.apiKey);
      if (!verified) {
        res.status(401).json({ error: 'Session Firebase invalide ou expirée.' });
        return;
      }
    }

    const { to, subject, text, senderName, replyTo } = req.body as {
      to?: string;
      subject?: string;
      text?: string;
      senderName?: string;
      replyTo?: string;
    };

    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) {
      res.status(400).json({ error: 'Adresse email destinataire invalide.' });
      return;
    }
    if (!subject || !subject.trim() || !text || !text.trim()) {
      res.status(400).json({ error: 'Objet et contenu du message requis.' });
      return;
    }

    if (!isSmtpConfigured()) {
      res.status(503).json({
        error: 'Configuration SMTP manquante sur le serveur (SMTP_HOST, SMTP_USER, SMTP_PASS).',
      });
      return;
    }

    try {
      const smtpPort = Number(process.env.SMTP_PORT || 587);
      const secure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: smtpPort,
        secure,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
      const formattedFrom = senderName ? `"${senderName.replace(/"/g, '')}" <${fromAddress}>` : fromAddress;

      const info = await transporter.sendMail({
        from: formattedFrom,
        to: to.trim(),
        replyTo: replyTo?.trim() || fromAddress,
        subject: subject.trim(),
        text: text.trim(),
      });

      res.json({ ok: true, messageId: info.messageId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue lors de l’envoi SMTP.';
      res.status(500).json({ error: `Échec envoi SMTP : ${msg}` });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`TransMove ERP server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
