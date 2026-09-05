import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import pg from 'pg';

const port = Number(process.env.PORT || 3000);
const databaseUrl = process.env.DATABASE_URL;
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
const adminEmail = (process.env.ADMIN_EMAIL || 'contact@takotransport.online').trim().toLowerCase();
const sendGridApiKey = process.env.SENDGRID_API_KEY;
const sendGridFromEmail = process.env.SENDGRID_FROM_EMAIL;
const sendGridFromName = process.env.SENDGRID_FROM_NAME || 'TaKo';
const infobipBaseUrl = String(process.env.INFOBIP_BASE_URL || '').trim().replace(/\/+$/, '');
const infobipApiKey = String(process.env.INFOBIP_API_KEY || '').trim();
const infobipSmsSender = String(process.env.INFOBIP_SMS_SENDER || 'TaKo').trim();
const infobipEmailFrom = String(
  process.env.INFOBIP_EMAIL_FROM || process.env.ADMIN_EMAIL || 'contact@takotransport.online'
).trim().toLowerCase();
const infobipEmailFromName = String(process.env.INFOBIP_EMAIL_FROM_NAME || 'TaKo').trim();
const infobipWhatsAppSender = String(process.env.INFOBIP_WHATSAPP_SENDER || '').trim();
const infobipWhatsAppTemplate = String(
  process.env.INFOBIP_WHATSAPP_TEMPLATE || 'tako'
).trim();
const infobipWhatsAppLanguage = String(process.env.INFOBIP_WHATSAPP_LANGUAGE || 'fr').trim();
const publicApiUrl = String(process.env.PUBLIC_API_URL || 'https://tako-8whp.onrender.com').trim().replace(/\/+$/, '');
const ADMIN_SESSION_DURATION_MS = 12 * 60 * 60 * 1000;
const adminTwoFactorEnabled = String(process.env.ADMIN_2FA_ENABLED || '').toLowerCase() === 'true';
const adminLoginEmailAlertsEnabled = String(process.env.ADMIN_LOGIN_EMAIL_ALERTS || '').toLowerCase() === 'true';

const pool = databaseUrl
  ? new pg.Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    })
  : null;

function nowIso() {
  return new Date().toISOString();
}

function bundledNewsImage(fileName) {
  try {
    const data = fs.readFileSync(new URL(`../assets/images/${fileName}`, import.meta.url));
    return `data:image/jpeg;base64,${data.toString('base64')}`;
  } catch (error) {
    console.warn(`Bundled news image unavailable: ${fileName}`, error.message);
    return '';
  }
}

function adminPublicUser(account = {}) {
  return {
    id: account.id || 'ADMIN',
    fullName: account.full_name || account.fullName || 'Administrateur TaKo',
    email: account.email || adminEmail,
    phone: account.phone || '',
    photoUrl: account.photo_url || account.photoUrl || '',
    birthDate: '',
    role: 'admin',
    status: 'active',
    balance: 0,
    adminRole: account.admin_role || account.adminRole || 'Super administrateur',
  };
}

function createAdminSessionToken(adminId = 'ADMIN') {
  const issuedAt = Date.now();
  const payload = Buffer.from(
    JSON.stringify({ role: 'admin', adminId, issuedAt, expiresAt: issuedAt + ADMIN_SESSION_DURATION_MS, sessionId: crypto.randomUUID() }),
  ).toString('base64url');
  const signature = crypto.createHmac('sha256', adminPassword).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function readAdminSessionToken(token = '') {
  try {
    const [payload] = String(token).split('.');
    return payload ? JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) : null;
  } catch {
    return null;
  }
}

function requestSecurityContext(request) {
  const forwarded = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return {
    ipAddress: forwarded || request.socket?.remoteAddress || 'Indisponible',
    userAgent: String(request.headers['user-agent'] || 'Indisponible'),
  };
}

function verifyAdminSessionToken(token = '') {
  const [payload, signature] = String(token).split('.');
  if (!payload || !signature) {
    return false;
  }

  const expectedSignature = crypto.createHmac('sha256', adminPassword).update(payload).digest();
  let receivedSignature;
  try {
    receivedSignature = Buffer.from(signature, 'base64url');
  } catch {
    return false;
  }

  if (
    receivedSignature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(receivedSignature, expectedSignature)
  ) {
    return false;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return session.role === 'admin' && Number(session.expiresAt) > Date.now();
  } catch {
    return false;
  }
}

function normalizeContact(value = '') {
  const clean = String(value).trim().toLowerCase();
  if (clean.includes('@')) {
    return clean;
  }

  return clean.replace(/\s+/g, '');
}

function generateCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function isPhoneContact(contact) {
  return Boolean(contact) && !String(contact).includes('@');
}

function isInfobipSmsEnabled() {
  return Boolean(infobipBaseUrl && infobipApiKey && infobipSmsSender);
}

function isInfobipEmailEnabled() {
  return Boolean(infobipBaseUrl && infobipApiKey && infobipEmailFrom);
}

function isInfobipWhatsAppEnabled() {
  return Boolean(
    infobipBaseUrl &&
      infobipApiKey &&
      infobipWhatsAppSender &&
      infobipWhatsAppTemplate &&
      infobipWhatsAppLanguage
  );
}

function formatSmsPhone(contact) {
  const value = String(contact || '').trim().replace(/[\s()-]/g, '');

  if (value.startsWith('+')) {
    return value;
  }

  if (value.startsWith('00')) {
    return `+${value.slice(2)}`;
  }

  if (value.startsWith('243')) {
    return `+${value}`;
  }

  if (value.startsWith('0')) {
    return `+243${value.slice(1)}`;
  }

  return `+${value}`;
}

async function sendInfobipOtpSms(contact, code) {
  const baseUrl = /^https?:\/\//i.test(infobipBaseUrl)
    ? infobipBaseUrl
    : `https://${infobipBaseUrl}`;
  const response = await fetch(`${baseUrl}/sms/3/messages`, {
    method: 'POST',
    headers: {
      Authorization: `App ${infobipApiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      messages: [
        {
          sender: infobipSmsSender,
          destinations: [{ to: formatSmsPhone(contact) }],
          content: {
            text: `Votre code de confirmation TaKo est ${code}. Il expire dans 10 minutes.`,
          },
        },
      ],
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('Infobip SMS failed:', {
      status: response.status,
      statusText: response.statusText,
      error: result,
      destination: formatSmsPhone(contact),
      sender: infobipSmsSender,
      baseUrl,
    });
    const error = new Error('Impossible d’envoyer le code SMS. Vérifiez le numéro puis réessayez.');
    error.statusCode = 502;
    throw error;
  }

  return result;
}

async function sendInfobipOtpWhatsAppFirst(contact, code) {
  if (!isInfobipWhatsAppEnabled()) {
    await sendInfobipOtpSms(contact, code);
    return { delivery: 'sms', provider: 'infobip' };
  }

  const baseUrl = /^https?:\/\//i.test(infobipBaseUrl)
    ? infobipBaseUrl
    : `https://${infobipBaseUrl}`;
  const destination = formatSmsPhone(contact).replace(/^\+/, '');
  const smsText = `Votre code de confirmation TaKo est ${code}. Il expire dans 10 minutes.`;

  const response = await fetch(`${baseUrl}/whatsapp/1/message/template`, {
    method: 'POST',
    headers: {
      Authorization: `App ${infobipApiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      messages: [
        {
          from: infobipWhatsAppSender,
          to: destination,
          messageId: crypto.randomUUID(),
          content: {
            templateName: infobipWhatsAppTemplate,
            templateData: {
              body: { placeholders: [code] },
              buttons: [{ type: 'URL', parameter: code }],
            },
            language: infobipWhatsAppLanguage,
          },
          validityPeriod: 60,
          validityPeriodTimeUnit: 'SECONDS',
          smsFailover: {
            from: infobipSmsSender,
            text: smsText,
            validityPeriod: 10,
            validityPeriodTimeUnit: 'MINUTES',
          },
        },
      ],
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('Infobip WhatsApp failed; sending OTP by SMS:', {
      status: response.status,
      statusText: response.statusText,
      error: result,
      destination,
      sender: infobipWhatsAppSender,
      template: infobipWhatsAppTemplate,
      baseUrl,
    });
    await sendInfobipOtpSms(contact, code);
    return { delivery: 'sms', provider: 'infobip', fallback: true };
  }

  return {
    delivery: 'whatsapp',
    provider: 'infobip',
    fallback: 'sms',
    result,
  };
}

function generateClientId() {
  return `${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
}

async function generateUniqueClientId() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const id = generateClientId();
    const existing = await query('SELECT id FROM users WHERE id = $1 LIMIT 1;', [id]);
    if (!existing.rows.length) {
      return id;
    }
  }

  return String(crypto.randomInt(1000000000, 9999999999));
}

async function isEmailAlreadyUsed(contact) {
  const email = normalizeContact(contact);
  if (!email || !email.includes('@')) {
    return false;
  }

  const existing = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1;', [email]);
  return existing.rowCount > 0;
}

async function sendInfobipVerificationEmail(contact, code, purpose) {
  const isReset = purpose === 'reset';
  const isAdmin = String(purpose).startsWith('admin-2fa');
  const subject = isReset ? 'Votre code de récupération TaKo' : isAdmin ? 'Votre code de sécurité administrateur TaKo' : 'Confirmez votre compte TaKo';
  const title = isReset ? 'Récupération de votre compte TaKo' : isAdmin ? 'Vérification de votre accès TaKo' : 'Confirmation de votre compte TaKo';
  const instruction = isReset ? 'Utilisez le code ci-dessous pour réinitialiser votre mot de passe.' : isAdmin ? 'Utilisez ce code pour confirmer votre connexion sécurisée à l’administration.' : 'Utilisez le code ci-dessous pour confirmer votre compte.';
  const safeCode = String(code).replace(/[^0-9]/g, '').slice(0, 6);
  const logoUrl = `${publicApiUrl}/assets/tako-logo.jpeg?v=1`;
  const text = `${title}\n\n${instruction}\n\nCode : ${safeCode}\n\nCe code expire dans 10 minutes.\n\nSi vous n’avez pas demandé ce code, ignorez cet e-mail.\n\nTaKo Transport`;
  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#F3F6FC;font-family:Inter,'Segoe UI',Arial,sans-serif;color:#061F68">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F3F6FC"><tr><td align="center" style="padding:32px 12px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:#FFFFFF;border-radius:18px;overflow:hidden;box-shadow:0 12px 35px rgba(6,31,104,.10)">
      <tr><td align="center" height="92" style="background:#061F68;height:92px;padding:0 24px">
        <div style="width:190px;height:58px;overflow:hidden;margin:0 auto">
          <img src="${logoUrl}" width="190" height="190" alt="TaKo Transport" style="display:block;width:190px;height:190px;max-width:none;border:0;margin-top:-63px">
        </div>
      </td></tr>
      <tr><td style="padding:42px 54px 24px">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="background:#EEF6FF;border-radius:24px;padding:9px 16px;color:#0879E8;font-size:13px;font-weight:700;letter-spacing:.4px">🛡 CODE DE CONFIRMATION</td></tr></table>
        <h1 style="margin:25px 0 18px;color:#061F68;font-size:30px;line-height:1.2;font-weight:700">${title}</h1>
        <div style="height:1px;background:#DCE3EE;margin:0 0 28px"></div>
        <p style="margin:0 0 14px;font-size:17px;line-height:1.6;color:#202B45;font-weight:600">Bonjour,</p>
        <p style="margin:0 0 28px;font-size:16px;line-height:1.65;color:#3F4B63">${instruction}</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="background:#F4F8FF;border:1px solid #CFE0F8;border-radius:14px;padding:25px 12px;color:#0879E8;font-size:42px;font-weight:700;letter-spacing:12px">${safeCode}</td></tr></table>
        <p style="margin:23px 0 0;text-align:center;font-size:15px;color:#3F4B63">◷ &nbsp;Ce code expire dans <strong style="color:#0879E8">10 minutes</strong>.</p>
        <div style="height:1px;background:#E3E8F0;margin:31px 0 23px"></div>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="color:#0879E8;font-size:21px;padding-right:12px">♢</td><td style="font-size:14px;line-height:1.55;color:#556176">Si vous n’avez pas demandé ce code, ignorez cet e-mail. Ne partagez jamais ce code avec une autre personne.</td></tr></table>
      </td></tr>
      <tr><td align="center" style="padding:25px 30px 31px;border-top:1px solid #E3E8F0;color:#7A8497;font-size:12px;line-height:1.7">
        Av. Kwango, Immeuble 130B, 5e niveau, Gombe, Kinshasa<br>© ${new Date().getFullYear()} TaKo Transport · Message automatique
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  const baseUrl = /^https?:\/\//i.test(infobipBaseUrl)
    ? infobipBaseUrl
    : `https://${infobipBaseUrl}`;
  const form = new FormData();
  form.append('from', infobipEmailFromName ? `${infobipEmailFromName} <${infobipEmailFrom}>` : infobipEmailFrom);
  form.append('to', contact);
  form.append('replyTo', infobipEmailFrom);
  form.append('subject', subject);
  form.append('text', text);
  form.append('html', html);

  const response = await fetch(`${baseUrl}/email/3/send`, {
    method: 'POST',
    headers: {
      Authorization: `App ${infobipApiKey}`,
      Accept: 'application/json',
    },
    body: form,
  });

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    console.error('Infobip Email failed:', { status: response.status, error: result, destination: contact, sender: infobipEmailFrom, baseUrl });
    const error = new Error('Impossible d’envoyer le code par e-mail. Vérifiez l’adresse puis réessayez.');
    error.statusCode = 502;
    throw error;
  }

  return { delivery: 'email', provider: 'infobip' };
}

async function sendAccountCreatedEmail(user) {
  if (!sendGridApiKey || !sendGridFromEmail || !user?.email) {
    return false;
  }

  const roleLabel =
    user.role === 'agent' ? 'Agent' : user.role === 'chauffeur' ? 'Chauffeur' : 'Passager';
  const statusText =
    user.status === 'pending'
      ? 'Votre compte est en attente de validation par l’administrateur.'
      : 'Votre compte est actif. Vous pouvez vous connecter avec votre ID ou votre email.';
  const subject = 'Votre compte TaKo a été créé';
  const text = `Bonjour ${user.full_name},\n\nVotre compte TaKo a été créé.\n\nID TaKo : ${user.id}\nType de compte : ${roleLabel}\nStatut : ${user.status}\n\n${statusText}\n\nConservez cet email. Votre ID peut servir à vous connecter et à récupérer votre compte.\n\nTaKo`;
  const html = `
    <div style="font-family:Arial,sans-serif;color:#202836;line-height:1.55">
      <h2 style="color:#061F68">Votre compte TaKo a été créé</h2>
      <p>Bonjour ${user.full_name},</p>
      <p>Voici vos informations de compte :</p>
      <div style="border:1px solid #D7E0EF;border-radius:14px;padding:16px;background:#F5F8FF">
        <p style="margin:0 0 8px"><strong>ID TaKo :</strong> <span style="color:#139DFF;font-size:20px;font-weight:800">${user.id}</span></p>
        <p style="margin:0 0 8px"><strong>Type de compte :</strong> ${roleLabel}</p>
        <p style="margin:0"><strong>Statut :</strong> ${user.status}</p>
      </div>
      <p>${statusText}</p>
      <p style="color:#6b7280">Conservez cet email. Votre ID peut servir à vous connecter et à récupérer votre compte.</p>
    </div>
  `;

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sendGridApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: user.email }],
          subject,
        },
      ],
      from: {
        email: sendGridFromEmail,
        name: sendGridFromName,
      },
      reply_to: {
        email: sendGridFromEmail,
        name: sendGridFromName,
      },
      tracking_settings: {
        click_tracking: {
          enable: false,
          enable_text: false,
        },
        open_tracking: {
          enable: false,
        },
      },
      content: [
        { type: 'text/plain', value: text },
        { type: 'text/html', value: html },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error('SendGrid account email failed:', response.status, errorText);
    return false;
  }

  return true;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) {
    return false;
  }

  const [salt] = storedHash.split(':');
  return hashPassword(password, salt) === storedHash;
}

async function query(sql, params = []) {
  if (!pool) {
    const error = new Error('DATABASE_URL manquant');
    error.statusCode = 503;
    throw error;
  }

  return pool.query(sql, params);
}

async function initDatabase() {
  if (!pool) {
    console.warn('DATABASE_URL missing. Server will run without PostgreSQL.');
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT UNIQUE,
      birth_date TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'passager',
      status TEXT NOT NULL DEFAULT 'active',
      balance NUMERIC NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique_idx
    ON users (LOWER(email))
    WHERE email IS NOT NULL;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS verification_codes (
      contact TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      purpose TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS nfc_cards (
      client_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      card_id TEXT NOT NULL UNIQUE,
      blocked BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS driver_trip_settings (
      driver_id TEXT PRIMARY KEY,
      bus_plate TEXT NOT NULL,
      route TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE driver_trip_settings ADD COLUMN IF NOT EXISTS vehicle TEXT;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS agent_profiles (
      agent_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      assignment_zone TEXT,
      manager_name TEXT,
      agent_role TEXT NOT NULL DEFAULT 'Agent terrain',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      amount NUMERIC NOT NULL,
      method TEXT NOT NULL,
      client_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      driver_id TEXT,
      bus_plate TEXT,
      route TEXT,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      client_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      amount NUMERIC,
      type TEXT NOT NULL,
      read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS news_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'Information',
      image_url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      publish_start TIMESTAMPTZ,
      publish_end TIMESTAMPTZ,
      created_by TEXT NOT NULL DEFAULT 'Admin TaKo',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS partner_agencies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      service_type TEXT NOT NULL DEFAULT 'Voyage',
      cities TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      sales_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS travel_schedules (
      id TEXT PRIMARY KEY,
      departure TEXT NOT NULL,
      arrival TEXT NOT NULL,
      departure_at TIMESTAMPTZ NOT NULL,
      agency TEXT NOT NULL DEFAULT '',
      duration TEXT NOT NULL DEFAULT '',
      price NUMERIC NOT NULL DEFAULT 0,
      vehicle TEXT NOT NULL DEFAULT '',
      capacity INTEGER NOT NULL DEFAULT 0,
      occupied INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'scheduled',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cancellation_requests (
      id TEXT PRIMARY KEY,
      booking_reference TEXT NOT NULL,
      client_id TEXT,
      client_name TEXT NOT NULL DEFAULT '',
      client_phone TEXT NOT NULL DEFAULT '',
      route TEXT NOT NULL DEFAULT '',
      travel_date TIMESTAMPTZ,
      amount NUMERIC NOT NULL DEFAULT 0,
      request_type TEXT NOT NULL DEFAULT 'cancellation',
      reason TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      processed_at TIMESTAMPTZ
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_security_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS server_activity_events (
      id TEXT PRIMARY KEY,
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      status_code INTEGER NOT NULL,
      title TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS server_activity_events_created_at_idx ON server_activity_events (created_at DESC);`);
  await pool.query(`ALTER TABLE server_activity_events ADD COLUMN IF NOT EXISTS event_type TEXT;`);
  await pool.query(`ALTER TABLE server_activity_events ADD COLUMN IF NOT EXISTS message TEXT;`);
  await pool.query(`ALTER TABLE server_activity_events ADD COLUMN IF NOT EXISTS amount NUMERIC;`);
  await pool.query(`ALTER TABLE server_activity_events ADD COLUMN IF NOT EXISTS user_id TEXT;`);
  await pool.query(`ALTER TABLE server_activity_events ADD COLUMN IF NOT EXISTS user_name TEXT;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_profiles (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      photo_url TEXT NOT NULL DEFAULT '',
      company_name TEXT NOT NULL DEFAULT 'TaKo Transport',
      business_sector TEXT NOT NULL DEFAULT 'Transport & Mobilité',
      country TEXT NOT NULL DEFAULT 'République Démocratique du Congo',
      city TEXT NOT NULL DEFAULT 'Kinshasa',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE admin_profiles ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE;`);
  await pool.query(`
    INSERT INTO admin_profiles (id, full_name, email)
    VALUES ('ADMIN', 'Admin TaKo', $1)
    ON CONFLICT (id) DO NOTHING;
  `, [adminEmail]);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_accounts (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL DEFAULT '',
      photo_url TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      admin_role TEXT NOT NULL DEFAULT 'Administrateur',
      status TEXT NOT NULL DEFAULT 'active',
      must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE admin_accounts ADD COLUMN IF NOT EXISTS photo_url TEXT NOT NULL DEFAULT '';`);
  const rootAdmin = await pool.query('SELECT id FROM admin_accounts WHERE id = $1 LIMIT 1;', ['ADMIN']);
  if (!rootAdmin.rowCount) {
    await pool.query(`
      INSERT INTO admin_accounts (id, full_name, email, phone, password_hash, admin_role, status, must_change_password)
      VALUES ('ADMIN', 'Admin TaKo', $1, '', $2, 'Super administrateur', 'active', FALSE);
    `, [adminEmail, hashPassword(adminPassword)]);
  } else {
    await pool.query('UPDATE admin_accounts SET email = $1, updated_at = NOW() WHERE id = $2;', [adminEmail, 'ADMIN']);
  }
  await pool.query(`
    UPDATE admin_accounts AS account
    SET full_name = profile.full_name, email = profile.email, phone = profile.phone,
        photo_url = profile.photo_url, updated_at = NOW()
    FROM admin_profiles AS profile
    WHERE account.id = 'ADMIN' AND profile.id = 'ADMIN';
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_preferences (
      admin_id TEXT PRIMARY KEY,
      preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    INSERT INTO admin_preferences (admin_id, preferences)
    VALUES ('ADMIN', $1::jsonb)
    ON CONFLICT (admin_id) DO NOTHING;
  `, [JSON.stringify({
    theme: 'light', primaryColor: '#1268E8', language: 'fr', timezone: 'Africa/Kinshasa',
    dateFormat: 'DD/MM/YYYY', timeFormat: '24h', rowsPerPage: 10, density: 'comfortable',
    animations: true, defaultPage: 'dashboard', reportPeriod: '30d', emailLanguage: 'fr',
    communications: true, emailNotifications: true, pushNotifications: true, smsNotifications: false,
  })]);

  const newsSeedMigration = await pool.query(
    'SELECT id FROM app_migrations WHERE id = $1 LIMIT 1;',
    ['seed-initial-news-v1'],
  );
  if (!newsSeedMigration.rowCount) {
    const initialNews = [
      ['news-tako-trajets', 'Voyagez avec TaKo', 'Découvrez les services TaKo pour vos déplacements.', 'Information', 'news-tako-trajets.jpeg'],
      ['news-tako-petit-transport', 'TaKo, même pour les petits transports', 'Payez simplement votre transport avec TaKo.', 'Information', 'news-tako-petit-transport.jpeg'],
      ['news-tako-public-transport', 'Je paye mon transport public', 'Votre paiement de transport, simple et rapide avec TaKo.', 'Promotion', 'news-tako-public-transport.jpeg'],
      ['news-tako-eglise', 'Vous allez à l’église ?', 'Payez votre transport avec TaKo.', 'Annonce', 'news-tako-eglise.jpeg'],
    ];
    for (const [id, title, content, category, fileName] of initialNews) {
      const imageUrl = bundledNewsImage(fileName);
      if (imageUrl) {
        await pool.query(`
          INSERT INTO news_items (id, title, content, category, image_url, status, publish_start)
          VALUES ($1, $2, $3, $4, $5, 'published', NOW())
          ON CONFLICT (id) DO NOTHING;
        `, [id, title, content, category, imageUrl]);
      }
    }
    await pool.query(
      'INSERT INTO app_migrations (id) VALUES ($1) ON CONFLICT (id) DO NOTHING;',
      ['seed-initial-news-v1'],
    );
  }
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  });
  response.end(JSON.stringify(data));
}

function sendError(response, error) {
  sendJson(response, error.statusCode || 500, {
    ok: false,
    error: error.publicMessage || error.message || 'Erreur serveur',
  });
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function getUserByLogin(login) {
  const value = normalizeContact(login);
  const result = await query(
    `
      SELECT u.*, c.card_id, c.blocked AS nfc_blocked
      FROM users u
      LEFT JOIN nfc_cards c ON c.client_id = u.id
      WHERE LOWER(u.id) = LOWER($1)
         OR LOWER(u.email) = LOWER($1)
         OR u.phone = $1
      LIMIT 1;
    `,
    [value],
  );

  return result.rows[0] || null;
}

function publicUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email || '',
    phone: user.phone || '',
    birthDate: user.birth_date || '',
    role: user.role,
    status: user.status,
    balance: Number(user.balance || 0),
    nfcCardId: user.card_id || null,
    nfcCardBlocked: Boolean(user.nfc_blocked),
    createdAt: user.created_at,
  };
}

async function createNotification({ clientId, title, message, amount = null, type }) {
  if (!clientId) {
    return null;
  }

  const id = `not_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const result = await query(
    `
      INSERT INTO notifications (id, client_id, title, message, amount, type)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, client_id, title, message, amount, type, read, created_at;
    `,
    [id, clientId, title, message, amount, type],
  );

  return result.rows[0];
}

async function createAdminActivity({ eventType, title, message, amount = null, userId = null, userName = null, statusCode = 200 }) {
  if (!pool) return null;
  const result = await query(`INSERT INTO server_activity_events
    (id, method, path, status_code, title, event_type, message, amount, user_id, user_name)
    VALUES ($1, 'EVENT', '', $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, title, event_type AS "eventType", message, amount,
      user_id AS "userId", user_name AS "userName", status_code AS "statusCode",
      read, created_at AS "createdAt";`, [
    crypto.randomUUID(), statusCode, title, eventType, message, amount, userId, userName,
  ]);
  return result.rows[0];
}

async function verifyStoredCode(contact, code, purpose, consume = true) {
  const cleanContact = normalizeContact(contact);
  const result = await query(
    `
      SELECT *
      FROM verification_codes
      WHERE contact = $1 AND purpose = $2 AND expires_at > NOW()
      LIMIT 1;
    `,
    [cleanContact, purpose],
  );

  const storedCode = result.rows[0];
  if (!storedCode || storedCode.code !== String(code).trim()) {
    const error = new Error('Code incorrect ou expiré');
    error.statusCode = 400;
    throw error;
  }

  if (consume) {
    await query('DELETE FROM verification_codes WHERE contact = $1 AND purpose = $2;', [cleanContact, purpose]);
  }
}

async function verifyCode(contact, code, purpose, consume = true) {
  const cleanContact = normalizeContact(contact);
  await verifyStoredCode(cleanContact, code, purpose, consume);
}

async function handleRequest(request, response) {
  const url = new URL(request.url ?? '/', `http://${request.headers.host}`);

  if (request.method !== 'OPTIONS' && url.pathname !== '/health') {
    response.once('finish', () => console.info(`${request.method} ${url.pathname} - HTTP ${response.statusCode}`));
  }

  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  if (request.method === 'GET' && url.pathname === '/') {
    sendJson(response, 200, {
      ok: true,
      name: 'TaKo API',
      status: 'online',
      database: pool ? 'connected' : 'disabled',
      time: nowIso(),
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/health') {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/assets/tako-logo.jpeg') {
    try {
      const logo = fs.readFileSync(new URL('../assets/images/tako-logo.jpeg', import.meta.url));
      response.writeHead(200, {
        'Content-Type': 'image/jpeg',
        'Content-Length': logo.length,
        'Cache-Control': 'public, max-age=86400, immutable',
        'Access-Control-Allow-Origin': '*',
      });
      response.end(logo);
    } catch {
      sendJson(response, 404, { ok: false, error: 'Logo indisponible' });
    }
    return;
  }

  if (request.method === 'POST' && url.pathname === '/auth/request-code') {
    const body = await readJson(request);
    const contact = normalizeContact(body.contact);
    const purpose = String(body.purpose || 'register');

    if (!contact) {
      sendJson(response, 400, { ok: false, error: 'Email ou numéro obligatoire' });
      return;
    }

    if (purpose === 'register' && await isEmailAlreadyUsed(contact)) {
      sendJson(response, 409, {
        ok: false,
        error: 'Cet email est déjà utilisé. Connectez-vous avec ce compte ou utilisez un autre email.',
      });
      return;
    }

    const recentCode = await query(
      `
        SELECT created_at
        FROM verification_codes
        WHERE contact = $1
          AND purpose = $2
          AND created_at > NOW() - INTERVAL '30 seconds'
        LIMIT 1;
      `,
      [contact, purpose],
    );

    if (recentCode.rowCount) {
      sendJson(response, 429, {
        ok: false,
        error: 'Code déjà envoyé. Veuillez attendre quelques secondes avant de demander un nouveau code.',
      });
      return;
    }

    const useSms = isPhoneContact(contact);
    if (useSms && !isInfobipSmsEnabled()) {
      sendJson(response, 503, { ok: false, error: 'Le service OTP Infobip n’est pas configuré.' });
      return;
    }
    if (!useSms && !isInfobipEmailEnabled()) {
      sendJson(response, 503, { ok: false, error: 'Le service OTP e-mail Infobip n’est pas configuré.' });
      return;
    }
    const code = generateCode();
    await query(
      `
        INSERT INTO verification_codes (contact, code, purpose, expires_at, created_at)
        VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes', NOW())
        ON CONFLICT (contact)
        DO UPDATE SET code = EXCLUDED.code, purpose = EXCLUDED.purpose, expires_at = EXCLUDED.expires_at, created_at = NOW();
      `,
      [contact, code, purpose],
    );

    if (useSms) {
      let delivery;
      try {
        delivery = await sendInfobipOtpWhatsAppFirst(contact, code);
      } catch (error) {
        await query('DELETE FROM verification_codes WHERE contact = $1 AND purpose = $2;', [contact, purpose]);
        throw error;
      }

      sendJson(response, 200, {
        ok: true,
        message:
          delivery.delivery === 'whatsapp'
            ? 'Code envoyé par WhatsApp avec secours SMS'
            : 'Code envoyé par SMS',
        ...delivery,
      });
      return;
    }

    let delivery;
    try {
      delivery = await sendInfobipVerificationEmail(contact, code, purpose);
    } catch (error) {
      await query('DELETE FROM verification_codes WHERE contact = $1 AND purpose = $2;', [contact, purpose]);
      throw error;
    }

    sendJson(response, 200, {
      ok: true,
      message: 'Code envoyé par e-mail',
      ...delivery,
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/auth/verify-code') {
    const body = await readJson(request);
    const contact = normalizeContact(body.contact);
    const purpose = String(body.purpose || 'register');

    if (!contact || !body.code) {
      sendJson(response, 400, { ok: false, error: 'Contact et code obligatoires' });
      return;
    }

    await verifyCode(contact, body.code, purpose, false);
    sendJson(response, 200, {
      ok: true,
      verified: true,
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/prepaid-cards/request-code') {
    const body = await readJson(request);
    const phone = normalizeContact(body.phone);

    if (!phone || phone.includes('@')) {
      sendJson(response, 400, { ok: false, error: 'Numéro de téléphone obligatoire' });
      return;
    }

    if (!isInfobipSmsEnabled()) {
      sendJson(response, 503, { ok: false, error: 'Le service OTP Infobip n’est pas configuré.' });
      return;
    }
    const code = generateCode();
    await query(
      `
        INSERT INTO verification_codes (contact, code, purpose, expires_at, created_at)
        VALUES ($1, $2, 'prepaid-card', NOW() + INTERVAL '10 minutes', NOW())
        ON CONFLICT (contact)
        DO UPDATE SET code = EXCLUDED.code, purpose = EXCLUDED.purpose, expires_at = EXCLUDED.expires_at, created_at = NOW();
      `,
      [phone, code],
    );

    let delivery;
    try {
      delivery = await sendInfobipOtpWhatsAppFirst(phone, code);
    } catch (error) {
      await query('DELETE FROM verification_codes WHERE contact = $1 AND purpose = $2;', [phone, 'prepaid-card']);
      throw error;
    }

    sendJson(response, 200, {
      ok: true,
      message:
        delivery.delivery === 'whatsapp'
          ? 'Code envoyé par WhatsApp au client avec secours SMS'
          : 'Code envoyé par SMS au client',
      ...delivery,
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/prepaid-cards/activate') {
    const body = await readJson(request);
    const phone = normalizeContact(body.phone);
    const code = String(body.code || '').trim();
    const cardId = String(body.cardId || '').trim();

    if (!phone || phone.includes('@') || !code || !cardId) {
      sendJson(response, 400, { ok: false, error: 'Téléphone, code et carte NFC obligatoires' });
      return;
    }

    await verifyCode(phone, code, 'prepaid-card');

    const cardOwner = await query('SELECT client_id FROM nfc_cards WHERE card_id = $1 LIMIT 1;', [cardId]);
    if (cardOwner.rowCount) {
      sendJson(response, 409, { ok: false, error: 'Cette carte NFC est déjà activée' });
      return;
    }

    let userResult = await query('SELECT * FROM users WHERE phone = $1 AND role = $2 LIMIT 1;', [phone, 'passager']);
    let user = userResult.rows[0];

    if (!user) {
      const id = await generateUniqueClientId();
      const lastDigits = phone.slice(-4) || id.slice(-4);
      userResult = await query(
        `
          INSERT INTO users (id, full_name, email, phone, birth_date, password_hash, role, status)
          VALUES ($1, $2, NULL, $3, $4, $5, 'passager', 'active')
          RETURNING *;
        `,
        [id, `Client carte ${lastDigits}`, phone, 'Non renseignée', hashPassword(crypto.randomBytes(18).toString('hex'))],
      );
      user = userResult.rows[0];
    }

    await query(
      `
        INSERT INTO nfc_cards (client_id, card_id, blocked, updated_at)
        VALUES ($1, $2, FALSE, NOW())
        ON CONFLICT (client_id)
        DO UPDATE SET card_id = EXCLUDED.card_id, blocked = FALSE, updated_at = NOW();
      `,
      [user.id, cardId],
    );

    await createNotification({
      clientId: user.id,
      title: 'Carte prépayée activée',
      message: 'Votre carte NFC prépayée est prête pour le transport.',
      type: 'nfc',
    });

    sendJson(response, 200, {
      ok: true,
      client: publicUser(user),
      card: {
        clientId: user.id,
        cardId,
        blocked: false,
      },
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/auth/register') {
    const body = await readJson(request);
    const contact = normalizeContact(body.contact);
    const fullName = String(body.fullName || '').trim();
    const birthDate = String(body.birthDate || '').trim();
    const password = String(body.password || '');
    const role = String(body.role || 'passager');

    if (!contact || !body.code || !fullName || !birthDate || password.length < 4) {
      sendJson(response, 400, { ok: false, error: 'Informations obligatoires manquantes' });
      return;
    }

    const email = contact.includes('@') ? contact : null;
    const phone = contact.includes('@') ? null : contact;

    if (email && await isEmailAlreadyUsed(email)) {
      sendJson(response, 409, {
        ok: false,
        error: 'Cet email est déjà utilisé. Connectez-vous avec ce compte ou utilisez un autre email.',
      });
      return;
    }

    await verifyCode(contact, body.code, 'register');

    const id = await generateUniqueClientId();
    const status = role === 'chauffeur' || role === 'agent' ? 'pending' : 'active';
    let result;

    try {
      result = await query(
        `
          INSERT INTO users (id, full_name, email, phone, birth_date, password_hash, role, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *;
        `,
        [id, fullName, email, phone, birthDate, hashPassword(password), role, status],
      );
    } catch (error) {
      if (email && error?.code === '23505') {
        sendJson(response, 409, {
          ok: false,
          error: 'Cet email est déjà utilisé. Connectez-vous avec ce compte ou utilisez un autre email.',
        });
        return;
      }
      throw error;
    }
    const accountEmailSent = await sendAccountCreatedEmail(result.rows[0]);
    if (role === 'chauffeur' || role === 'agent') {
      await createAdminActivity({ eventType: 'account_pending', title: role === 'chauffeur' ? 'Nouveau chauffeur à valider' : 'Nouvel agent à valider', message: `${fullName} vient de créer un compte ${role}.`, userId: id, userName: fullName });
    }

    sendJson(response, 201, {
      ok: true,
      user: publicUser(result.rows[0]),
      accountEmailSent,
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/auth/login') {
    const body = await readJson(request);
    const user = await getUserByLogin(body.login);

    if (!user || !verifyPassword(body.password, user.password_hash)) {
      sendJson(response, 401, { ok: false, error: 'Identifiants incorrects' });
      return;
    }

    if ((user.role === 'chauffeur' || user.role === 'agent') && user.status !== 'active') {
      sendJson(response, 403, { ok: false, error: 'Votre compte est en attente de validation administrateur' });
      return;
    }

    if (['blocked', 'closed', 'suspended'].includes(user.status)) {
      sendJson(response, 403, { ok: false, error: 'Ce compte est bloqué ou fermé' });
      return;
    }

    sendJson(response, 200, {
      ok: true,
      user: publicUser(user),
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/auth/admin-login') {
    const body = await readJson(request);
    const login = String(body.login || '').trim();
    const password = String(body.password || '');

    if (!login || !password) {
      sendJson(response, 400, { ok: false, error: 'Identifiant et mot de passe obligatoires' });
      return;
    }

    const accountResult = await query(`SELECT * FROM admin_accounts
      WHERE LOWER(email) = $1 OR phone = $2 LIMIT 1;`, [login.toLowerCase(), login]);
    const adminAccount = accountResult.rows[0];
    if (!adminAccount || !verifyPassword(password, adminAccount.password_hash)) {
      await createAdminActivity({ eventType: 'security_alert', title: 'Tentative de connexion Admin refusée', message: `Échec de connexion pour ${login}.`, userName: login, statusCode: 401 });
      sendJson(response, 401, { ok: false, error: 'Accès administrateur refusé' });
      return;
    }
    if (adminAccount.status !== 'active') {
      await createAdminActivity({ eventType: 'security_alert', title: 'Compte Admin désactivé utilisé', message: `Tentative de connexion au compte désactivé de ${adminAccount.full_name || login}.`, userId: adminAccount.id, userName: adminAccount.full_name || login, statusCode: 403 });
      sendJson(response, 403, { ok: false, error: 'Ce compte administrateur est désactivé.' });
      return;
    }

    const adminProfileResult = adminAccount.id === 'ADMIN'
      ? await query('SELECT email, two_factor_enabled FROM admin_profiles WHERE id = $1;', ['ADMIN'])
      : { rows: [] };
    const adminProfile = adminProfileResult.rows[0] || { email: adminEmail, two_factor_enabled: false };
    if (adminProfile.two_factor_enabled || adminTwoFactorEnabled) {
      if (!isInfobipEmailEnabled()) {
        sendJson(response, 503, { ok: false, error: 'Le service OTP e-mail Infobip n’est pas configuré.' });
        return;
      }
      const code = generateCode();
      const contact = normalizeContact(adminProfile.email || adminEmail);
      await query(`INSERT INTO verification_codes (contact, code, purpose, expires_at, created_at) VALUES ($1, $2, 'admin-2fa-login', NOW() + INTERVAL '10 minutes', NOW()) ON CONFLICT (contact) DO UPDATE SET code = EXCLUDED.code, purpose = EXCLUDED.purpose, expires_at = EXCLUDED.expires_at, created_at = NOW();`, [contact, code]);
      try { await sendInfobipVerificationEmail(contact, code, 'admin-2fa-login'); }
      catch (error) { await query('DELETE FROM verification_codes WHERE contact = $1 AND purpose = $2;', [contact, 'admin-2fa-login']); throw error; }
      sendJson(response, 200, { ok: true, requiresTwoFactor: true, contact });
      return;
    }

    const securityContext = requestSecurityContext(request);
    await query(
      'INSERT INTO admin_security_events (id, event_type, ip_address, user_agent) VALUES ($1, $2, $3, $4);',
      [crypto.randomUUID(), 'login_success', securityContext.ipAddress, securityContext.userAgent],
    );

    sendJson(response, 200, {
      ok: true,
      user: adminPublicUser(adminAccount),
      sessionToken: createAdminSessionToken(adminAccount.id),
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/auth/admin-login-verify') {
    const body = await readJson(request);
    const contact = normalizeContact(body.contact);
    await verifyCode(contact, body.code, 'admin-2fa-login');
    const securityContext = requestSecurityContext(request);
    await query('INSERT INTO admin_security_events (id, event_type, ip_address, user_agent) VALUES ($1, $2, $3, $4);', [crypto.randomUUID(), 'login_2fa_success', securityContext.ipAddress, securityContext.userAgent]);
    sendJson(response, 200, { ok: true, user: adminPublicUser(), sessionToken: createAdminSessionToken() });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/auth/admin-session') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }

    const session = readAdminSessionToken(body.sessionToken) || {};
    const accountResult = await query('SELECT * FROM admin_accounts WHERE id = $1 AND status = $2 LIMIT 1;', [session.adminId || 'ADMIN', 'active']);
    if (!accountResult.rows[0]) {
      sendJson(response, 401, { ok: false, error: 'Compte administrateur indisponible' });
      return;
    }
    sendJson(response, 200, {
      ok: true,
      user: adminPublicUser(accountResult.rows[0]),
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/accounts/list') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }
    const result = await query(`SELECT id, full_name AS "fullName", email, phone, photo_url AS "photoUrl", admin_role AS role,
      status, must_change_password AS "mustChangePassword", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM admin_accounts ORDER BY created_at ASC;`);
    sendJson(response, 200, { ok: true, accounts: result.rows });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/accounts/create') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }
    const fullName = String(body.fullName || '').trim();
    const email = normalizeContact(body.email);
    const phone = String(body.phone || '').trim();
    const password = String(body.password || '');
    const role = String(body.role || 'Administrateur').trim();
    const status = body.status === 'Désactivé' ? 'disabled' : 'active';
    if (!fullName || !email.includes('@') || password.length < 8) {
      sendJson(response, 400, { ok: false, error: 'Nom, e-mail valide et mot de passe de 8 caractères minimum obligatoires.' });
      return;
    }
    const duplicate = await query(`SELECT id FROM admin_accounts
      WHERE LOWER(email) = $1 OR ($2 <> '' AND phone = $2) LIMIT 1;`, [email, phone]);
    if (duplicate.rowCount) {
      sendJson(response, 409, { ok: false, error: 'Cet e-mail ou ce téléphone appartient déjà à un administrateur.' });
      return;
    }
    const id = `ADMIN-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const result = await query(`INSERT INTO admin_accounts
      (id, full_name, email, phone, password_hash, admin_role, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, full_name AS "fullName", email, phone, admin_role AS role, status,
        must_change_password AS "mustChangePassword", created_at AS "createdAt";`,
      [id, fullName, email, phone, hashPassword(password), role, status]);
    await createAdminActivity({ eventType: 'admin_created', title: 'Administrateur créé', message: `Nouveau compte ${role} créé pour ${fullName}.`, userId: id, userName: fullName });
    sendJson(response, 201, { ok: true, account: result.rows[0] });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/accounts/update') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }
    const accountId = String(body.accountId || '').trim();
    if (!accountId) {
      sendJson(response, 400, { ok: false, error: 'Compte administrateur invalide.' });
      return;
    }
    const existing = await query('SELECT * FROM admin_accounts WHERE id = $1 LIMIT 1;', [accountId]);
    if (!existing.rows[0]) {
      sendJson(response, 404, { ok: false, error: 'Administrateur introuvable.' });
      return;
    }
    const isPrimary = accountId === 'ADMIN';
    if (isPrimary && (body.fullName !== undefined || body.role !== undefined || body.status !== undefined)) {
      sendJson(response, 403, { ok: false, error: 'Le nom, le rôle et le statut du super administrateur principal sont protégés.' });
      return;
    }
    const fullName = body.fullName === undefined ? existing.rows[0].full_name : String(body.fullName).trim();
    const role = isPrimary ? 'Super administrateur' : (body.role === undefined ? existing.rows[0].admin_role : String(body.role).trim());
    const status = isPrimary ? 'active' : (body.status === undefined ? existing.rows[0].status : body.status === 'Désactivé' ? 'disabled' : 'active');
    const password = body.password === undefined ? '' : String(body.password);
    if (!fullName || !role || (password && password.length < 8)) {
      sendJson(response, 400, { ok: false, error: 'Nom et rôle obligatoires. Le mot de passe doit contenir au moins 8 caractères.' });
      return;
    }
    const passwordHash = password ? hashPassword(password) : existing.rows[0].password_hash;
    const result = await query(`UPDATE admin_accounts SET full_name = $2, admin_role = $3, status = $4,
      password_hash = $5, must_change_password = CASE WHEN $6 THEN TRUE ELSE must_change_password END, updated_at = NOW()
      WHERE id = $1 RETURNING id, full_name AS "fullName", email, phone, photo_url AS "photoUrl",
      admin_role AS role, status, created_at AS "createdAt";`,
      [accountId, fullName, role, status, passwordHash, Boolean(password)]);
    await createAdminActivity({ eventType: 'admin_updated', title: password ? 'Mot de passe administrateur réinitialisé' : 'Compte administrateur modifié', message: `${fullName} · ${role} · ${status === 'active' ? 'Actif' : 'Désactivé'}.`, userId: accountId, userName: fullName });
    sendJson(response, 200, { ok: true, account: result.rows[0] });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/accounts/delete') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }
    const accountId = String(body.accountId || '').trim();
    if (!accountId || accountId === 'ADMIN') {
      sendJson(response, 403, { ok: false, error: 'Le super administrateur principal ne peut pas être supprimé.' });
      return;
    }
    const deleted = await query('DELETE FROM admin_accounts WHERE id = $1 RETURNING full_name AS "fullName";', [accountId]);
    if (!deleted.rows[0]) {
      sendJson(response, 404, { ok: false, error: 'Administrateur introuvable.' });
      return;
    }
    await createAdminActivity({ eventType: 'admin_deleted', title: 'Compte administrateur supprimé', message: `Le compte de ${deleted.rows[0].fullName} a été supprimé.`, userId: accountId, userName: deleted.rows[0].fullName });
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/security') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }
    const session = readAdminSessionToken(body.sessionToken) || {};
    const context = requestSecurityContext(request);
    const events = await query(`
      SELECT id, event_type AS "eventType", ip_address AS "ipAddress",
             user_agent AS "userAgent", created_at AS "createdAt"
      FROM admin_security_events
      ORDER BY created_at DESC
      LIMIT 10;
    `);
    const profileSecurity = await query('SELECT two_factor_enabled FROM admin_profiles WHERE id = $1;', ['ADMIN']);
    sendJson(response, 200, {
      ok: true,
      security: {
        twoFactorEnabled: Boolean(profileSecurity.rows[0]?.two_factor_enabled || adminTwoFactorEnabled),
        loginEmailAlertsEnabled: adminLoginEmailAlertsEnabled,
        session: {
          issuedAt: session.issuedAt ? new Date(session.issuedAt).toISOString() : null,
          expiresAt: session.expiresAt ? new Date(session.expiresAt).toISOString() : null,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
        events: events.rows,
      },
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/activity/list') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }
    const requestedLimit = Number(body.limit || 30);
    const limit = Math.max(1, Math.min(Number.isFinite(requestedLimit) ? requestedLimit : 30, 100));
    const [events, unread] = await Promise.all([
      query(`SELECT id, status_code AS "statusCode", title, event_type AS "eventType",
        message, amount, user_id AS "userId", user_name AS "userName", read,
        created_at AS "createdAt"
        FROM server_activity_events WHERE event_type IS NOT NULL ORDER BY created_at DESC LIMIT $1;`, [limit]),
      query('SELECT COUNT(*)::int AS count FROM server_activity_events WHERE event_type IS NOT NULL AND read = FALSE;'),
    ]);
    sendJson(response, 200, { ok: true, events: events.rows, unreadCount: unread.rows[0]?.count || 0 });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/activity/read') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }
    await query('UPDATE server_activity_events SET read = TRUE WHERE event_type IS NOT NULL AND read = FALSE;');
    sendJson(response, 200, { ok: true, unreadCount: 0 });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/2fa/request') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }
    if (!isInfobipEmailEnabled()) {
      sendJson(response, 503, { ok: false, error: 'Le service OTP e-mail Infobip n’est pas configuré.' });
      return;
    }
    const profile = await query('SELECT email FROM admin_profiles WHERE id = $1;', ['ADMIN']);
    const contact = normalizeContact(profile.rows[0]?.email || adminEmail);
    const code = generateCode();
    await query(`INSERT INTO verification_codes (contact, code, purpose, expires_at, created_at) VALUES ($1, $2, 'admin-2fa-setup', NOW() + INTERVAL '10 minutes', NOW()) ON CONFLICT (contact) DO UPDATE SET code = EXCLUDED.code, purpose = EXCLUDED.purpose, expires_at = EXCLUDED.expires_at, created_at = NOW();`, [contact, code]);
    try { await sendInfobipVerificationEmail(contact, code, 'admin-2fa-setup'); }
    catch (error) { await query('DELETE FROM verification_codes WHERE contact = $1 AND purpose = $2;', [contact, 'admin-2fa-setup']); throw error; }
    sendJson(response, 200, { ok: true, contact, message: 'Code 2FA envoyé par e-mail avec Infobip.' });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/2fa/verify') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }
    const contact = normalizeContact(body.contact);
    await verifyCode(contact, body.code, 'admin-2fa-setup');
    await query('UPDATE admin_profiles SET two_factor_enabled = TRUE, updated_at = NOW() WHERE id = $1;', ['ADMIN']);
    const context = requestSecurityContext(request);
    await query('INSERT INTO admin_security_events (id, event_type, ip_address, user_agent) VALUES ($1, $2, $3, $4);', [crypto.randomUUID(), 'two_factor_enabled', context.ipAddress, context.userAgent]);
    sendJson(response, 200, { ok: true, twoFactorEnabled: true });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/profile') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }
    const result = await query(`
      SELECT id, full_name AS "fullName", email, phone, photo_url AS "photoUrl",
             company_name AS "companyName", business_sector AS "businessSector",
             country, city, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM admin_profiles WHERE id = 'ADMIN' LIMIT 1;
    `);
    sendJson(response, 200, { ok: true, profile: result.rows[0] || null });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/profile/update') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }
    const fullName = String(body.fullName || '').trim();
    const email = normalizeContact(body.email);
    const phone = String(body.phone || '').trim();
    const photoUrl = String(body.photoUrl || '').trim();
    const companyName = String(body.companyName || '').trim();
    const businessSector = String(body.businessSector || '').trim();
    const country = String(body.country || '').trim();
    const city = String(body.city || '').trim();
    if (!fullName || !email.includes('@') || !companyName || !businessSector || !country || !city) {
      sendJson(response, 400, { ok: false, error: 'Complétez correctement les informations obligatoires.' });
      return;
    }
    if (photoUrl.length > 3_000_000) {
      sendJson(response, 413, { ok: false, error: 'La photo dépasse la taille maximale autorisée.' });
      return;
    }
    const result = await query(`
      UPDATE admin_profiles SET full_name = $1, email = $2, phone = $3, photo_url = $4,
        company_name = $5, business_sector = $6, country = $7, city = $8, updated_at = NOW()
      WHERE id = 'ADMIN'
      RETURNING id, full_name AS "fullName", email, phone, photo_url AS "photoUrl",
                company_name AS "companyName", business_sector AS "businessSector",
                country, city, created_at AS "createdAt", updated_at AS "updatedAt";
    `, [fullName, email, phone, photoUrl, companyName, businessSector, country, city]);
    await query(`UPDATE admin_accounts SET full_name = $1, email = $2, phone = $3, photo_url = $4, updated_at = NOW()
      WHERE id = 'ADMIN';`, [fullName, email, phone, photoUrl]);
    sendJson(response, 200, { ok: true, profile: result.rows[0] });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/preferences') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }
    const result = await query('SELECT preferences, updated_at AS "updatedAt" FROM admin_preferences WHERE admin_id = $1;', ['ADMIN']);
    sendJson(response, 200, { ok: true, preferences: result.rows[0]?.preferences || {}, updatedAt: result.rows[0]?.updatedAt || null });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/preferences/update') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }
    const preferences = body.preferences && typeof body.preferences === 'object' ? body.preferences : null;
    if (!preferences || JSON.stringify(preferences).length > 20_000) {
      sendJson(response, 400, { ok: false, error: 'Préférences invalides.' });
      return;
    }
    const result = await query(`
      UPDATE admin_preferences SET preferences = $1::jsonb, updated_at = NOW()
      WHERE admin_id = 'ADMIN' RETURNING preferences, updated_at AS "updatedAt";
    `, [JSON.stringify(preferences)]);
    sendJson(response, 200, { ok: true, preferences: result.rows[0].preferences, updatedAt: result.rows[0].updatedAt });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/dashboard') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }

    const period = ['day', 'week', 'month'].includes(body.period) ? body.period : 'day';
    const interval = period === 'month' ? '30 days' : period === 'week' ? '7 days' : '1 day';
    const [usersResult, paymentsResult, previousPaymentsResult, rechargeResult, previousRechargeResult, totalCollectedResult] = await Promise.all([
      query(`
        SELECT
          COUNT(*) FILTER (WHERE role = 'passager')::int AS clients,
          COUNT(*) FILTER (WHERE role = 'passager' AND created_at < NOW() - $1::interval)::int AS previous_clients,
          COUNT(*) FILTER (WHERE role = 'chauffeur')::int AS drivers,
          COUNT(*) FILTER (WHERE role = 'chauffeur' AND created_at < NOW() - $1::interval)::int AS previous_drivers,
          COUNT(*) FILTER (WHERE role = 'chauffeur' AND status = 'active')::int AS active_drivers,
          COUNT(*) FILTER (WHERE role = 'chauffeur' AND status = 'pending')::int AS pending_drivers,
          COUNT(*) FILTER (WHERE role = 'chauffeur' AND status IN ('suspended', 'blocked'))::int AS suspended_drivers,
          COUNT(*) FILTER (WHERE role = 'agent')::int AS agents,
          COUNT(*) FILTER (WHERE role = 'agent' AND created_at < NOW() - $1::interval)::int AS previous_agents,
          COALESCE(SUM(balance) FILTER (
            WHERE role IN ('passager', 'chauffeur', 'agent')
              AND status <> 'closed'
          ), 0)::numeric AS available_balance,
          COALESCE(SUM(balance) FILTER (
            WHERE role = 'agent'
              AND status <> 'closed'
          ), 0)::numeric AS agent_balance
        FROM users;
      `, [interval]),
      query(
        `
          SELECT
            COUNT(*)::int AS transactions,
            COALESCE(SUM(amount) FILTER (
              WHERE status IN ('accepted', 'successful', 'success')
                AND method <> 'internal_recharge'
            ), 0)::numeric AS collected,
            COALESCE(SUM(amount) FILTER (
              WHERE status IN ('accepted', 'successful', 'success')
                AND method IN ('qr', 'nfc')
            ), 0)::numeric AS transport_collected,
            COUNT(*) FILTER (WHERE status IN ('failed', 'refused'))::int AS failed
          FROM payments
          WHERE created_at >= NOW() - $1::interval;
        `,
        [interval],
      ),
      query(
        `
          SELECT
            COUNT(*)::int AS transactions,
            COALESCE(SUM(amount) FILTER (
              WHERE status IN ('accepted', 'successful', 'success')
                AND method <> 'internal_recharge'
            ), 0)::numeric AS collected,
            COALESCE(SUM(amount) FILTER (
              WHERE status IN ('accepted', 'successful', 'success')
                AND method IN ('qr', 'nfc')
            ), 0)::numeric AS transport_collected
          FROM payments
          WHERE created_at >= NOW() - ($1::interval * 2)
            AND created_at < NOW() - $1::interval;
        `,
        [interval],
      ),
      query(
        `
          SELECT
            COUNT(*) FILTER (WHERE status IN ('accepted', 'successful', 'success'))::int AS successful,
            COUNT(*) FILTER (WHERE status IN ('failed', 'refused'))::int AS failed,
            COUNT(*) FILTER (WHERE status = 'pending')::int AS pending
          FROM payments
          WHERE method IN ('mobile_money', 'internal_recharge', 'agent_recharge')
            AND created_at >= NOW() - $1::interval;
        `,
        [interval],
      ),
      query(
        `
          SELECT
            COUNT(*) FILTER (WHERE status IN ('accepted', 'successful', 'success'))::int AS successful
          FROM payments
          WHERE method IN ('mobile_money', 'internal_recharge', 'agent_recharge')
            AND created_at >= NOW() - ($1::interval * 2)
            AND created_at < NOW() - $1::interval;
        `,
        [interval],
      ),
      query(`
        SELECT COALESCE(SUM(amount) FILTER (
          WHERE status IN ('accepted', 'successful', 'success')
            AND method <> 'internal_recharge'
        ), 0)::numeric AS collected
        FROM payments;
      `),
    ]);

    const users = usersResult.rows[0] || {};
    const payments = paymentsResult.rows[0] || {};
    const previousPayments = previousPaymentsResult.rows[0] || {};
    const recharges = rechargeResult.rows[0] || {};
    const previousRecharges = previousRechargeResult.rows[0] || {};
    const collected = Number(totalCollectedResult.rows[0]?.collected || 0);
    const transportCollected = Number(payments.transport_collected || 0);
    const commission = Math.round(transportCollected * 0.04);
    const previousTransportCollected = Number(previousPayments.transport_collected || 0);
    const percentChange = (current, previous) => {
      const currentValue = Number(current || 0);
      const previousValue = Number(previous || 0);
      if (previousValue <= 0) {
        return null;
      }
      return Math.round(((currentValue - previousValue) / previousValue) * 1000) / 10;
    };

    sendJson(response, 200, {
      ok: true,
      dashboard: {
        period,
        clients: Number(users.clients || 0),
        drivers: Number(users.drivers || 0),
        activeDrivers: Number(users.active_drivers || 0),
        pendingDrivers: Number(users.pending_drivers || 0),
        suspendedDrivers: Number(users.suspended_drivers || 0),
        agents: Number(users.agents || 0),
        transactions: Number(payments.transactions || 0),
        collected,
        agentBalance: Number(users.agent_balance || 0),
        availableBalance: Number(users.available_balance || 0),
        driverAmount: transportCollected - commission,
        commission,
        recharges: {
          successful: Number(recharges.successful || 0),
          failed: Number(recharges.failed || 0),
          pending: Number(recharges.pending || 0),
        },
        payouts: { successful: 0, failed: 0, pending: 0 },
        comparisonLabel: period === 'day' ? 'vs hier' : period === 'week' ? 'vs semaine précédente' : 'vs mois précédent',
        changes: {
          clients: percentChange(users.clients, users.previous_clients),
          drivers: percentChange(users.drivers, users.previous_drivers),
          agents: percentChange(users.agents, users.previous_agents),
          transactions: percentChange(payments.transactions, previousPayments.transactions),
          collected: null,
          driverAmount: percentChange(transportCollected, previousTransportCollected),
          commission: percentChange(transportCollected, previousTransportCollected),
          recharges: percentChange(recharges.successful, previousRecharges.successful),
          payouts: null,
          balance: null,
        },
        alerts: [
          ...(Number(users.pending_drivers || 0) > 0
            ? [{ level: 'warning', message: `${users.pending_drivers} chauffeur(s) en attente de validation` }]
            : []),
          ...(Number(payments.failed || 0) > 5
            ? [{ level: 'danger', message: 'Trop de paiements échoués sur la période' }]
            : []),
        ],
      },
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/nfc-cards/list') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }

    const search = String(body.search || '').trim();
    const status = body.status === 'active' || body.status === 'blocked' ? body.status : '';
    const activationDate = String(body.activationDate || '').trim();
    const page = Math.max(1, Number.parseInt(body.page, 10) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;
    const conditions = ['u.status <> \'closed\''];
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(c.card_id ILIKE $${params.length} OR u.full_name ILIKE $${params.length} OR u.phone ILIKE $${params.length} OR u.id ILIKE $${params.length})`);
    }
    if (status === 'active') conditions.push('c.blocked = FALSE');
    if (status === 'blocked') conditions.push('c.blocked = TRUE');
    if (activationDate) {
      params.push(activationDate);
      conditions.push(`DATE(c.updated_at) = DATE($${params.length})`);
    }
    const where = conditions.join(' AND ');
    const [statsResult, countResult, cardsResult] = await Promise.all([
      query(`
        SELECT COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE c.blocked = FALSE)::int AS active,
          COUNT(*) FILTER (WHERE c.blocked = TRUE)::int AS blocked,
          COALESCE(SUM(u.balance), 0) AS balance
        FROM nfc_cards c JOIN users u ON u.id = c.client_id
        WHERE u.status <> 'closed';
      `),
      query(`SELECT COUNT(*)::int AS total FROM nfc_cards c JOIN users u ON u.id = c.client_id WHERE ${where};`, params),
      query(`
        SELECT c.card_id, c.client_id, c.blocked, c.updated_at,
          u.full_name, u.phone, u.balance,
          (SELECT MAX(p.created_at) FROM payments p WHERE p.client_id = c.client_id) AS last_used_at
        FROM nfc_cards c JOIN users u ON u.id = c.client_id
        WHERE ${where}
        ORDER BY c.updated_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2};
      `, [...params, limit, offset]),
    ]);
    const stats = statsResult.rows[0] || {};
    sendJson(response, 200, {
      ok: true,
      stats: { total: Number(stats.total || 0), active: Number(stats.active || 0), blocked: Number(stats.blocked || 0), expired: 0, balance: Number(stats.balance || 0) },
      pagination: { page, limit, total: Number(countResult.rows[0]?.total || 0) },
      cards: cardsResult.rows.map((card) => ({
        cardId: card.card_id, clientId: card.client_id, blocked: card.blocked,
        activatedAt: card.updated_at, lastUsedAt: card.last_used_at,
        clientName: card.full_name, clientPhone: card.phone || '', balance: Number(card.balance || 0),
      })),
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/nfc-cards/enroll') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }
    const clientId = String(body.clientId || '').trim();
    const cardId = String(body.cardId || '').trim().toUpperCase();
    if (!clientId || !cardId) {
      sendJson(response, 400, { ok: false, error: 'Le client et l’UID sont obligatoires' });
      return;
    }
    const owner = await query('SELECT client_id FROM nfc_cards WHERE UPPER(card_id) = UPPER($1) AND client_id <> $2 LIMIT 1;', [cardId, clientId]);
    if (owner.rowCount) {
      sendJson(response, 409, { ok: false, error: 'Cette carte est déjà associée à un autre client' });
      return;
    }
    const client = await query("SELECT id FROM users WHERE id = $1 AND role = 'passager' AND status <> 'closed' LIMIT 1;", [clientId]);
    if (!client.rowCount) {
      sendJson(response, 404, { ok: false, error: 'Client introuvable' });
      return;
    }
    const result = await query(`INSERT INTO nfc_cards (client_id, card_id, blocked, updated_at) VALUES ($1, $2, FALSE, NOW()) ON CONFLICT (client_id) DO UPDATE SET card_id = EXCLUDED.card_id, blocked = FALSE, updated_at = NOW() RETURNING *;`, [clientId, cardId]);
    await createAdminActivity({ eventType: 'nfc_card', title: 'Carte NFC associée', message: `La carte ${cardId} a été associée au client ${clientId}.`, userId: clientId, userName: clientId });
    sendJson(response, 200, { ok: true, card: result.rows[0] });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/nfc-cards/status') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }
    const cardId = String(body.cardId || '').trim();
    const blocked = Boolean(body.blocked);
    const result = await query('UPDATE nfc_cards SET blocked = $2, updated_at = NOW() WHERE UPPER(card_id) = UPPER($1) RETURNING *;', [cardId, blocked]);
    if (!result.rowCount) {
      sendJson(response, 404, { ok: false, error: 'Carte introuvable' });
      return;
    }
    await createAdminActivity({ eventType: 'nfc_card', title: blocked ? 'Carte NFC bloquée' : 'Carte NFC débloquée', message: `La carte ${cardId} a été ${blocked ? 'bloquée' : 'débloquée'}.`, userId: result.rows[0].client_id, userName: result.rows[0].client_id });
    sendJson(response, 200, { ok: true, card: result.rows[0] });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/clients/list') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }

    const search = String(body.search || '').trim();
    const status = ['active', 'inactive', 'blocked', 'suspended', 'pending'].includes(body.status)
      ? body.status
      : '';
    const cardFilter = body.cardFilter === 'with' || body.cardFilter === 'without' ? body.cardFilter : '';
    const page = Math.max(1, Number.parseInt(body.page, 10) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;
    const conditions = [`u.role = 'passager'`, `u.status <> 'closed'`];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(u.full_name ILIKE $${params.length} OR u.phone ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.id ILIKE $${params.length})`);
    }
    if (status) {
      params.push(status);
      conditions.push(`u.status = $${params.length}`);
    }
    if (cardFilter === 'with') {
      conditions.push('c.card_id IS NOT NULL');
    } else if (cardFilter === 'without') {
      conditions.push('c.card_id IS NULL');
    }

    const where = conditions.join(' AND ');
    const listParams = [...params, limit, offset];
    const [statsResult, countResult, clientsResult] = await Promise.all([
      query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'active')::int AS active,
          COUNT(*) FILTER (WHERE status IN ('inactive', 'suspended', 'pending'))::int AS inactive,
          COUNT(*) FILTER (WHERE status = 'blocked')::int AS blocked
        FROM users
        WHERE role = 'passager' AND status <> 'closed';
      `),
      query(
        `SELECT COUNT(*)::int AS total FROM users u LEFT JOIN nfc_cards c ON c.client_id = u.id WHERE ${where};`,
        params,
      ),
      query(
        `
          SELECT
            u.id,
            u.full_name,
            u.phone,
            u.email,
            u.balance,
            u.status,
            u.created_at,
            c.card_id,
            c.blocked AS card_blocked
          FROM users u
          LEFT JOIN nfc_cards c ON c.client_id = u.id
          WHERE ${where}
          ORDER BY u.created_at DESC
          LIMIT $${params.length + 1}
          OFFSET $${params.length + 2};
        `,
        listParams,
      ),
    ]);

    sendJson(response, 200, {
      ok: true,
      stats: statsResult.rows[0],
      pagination: {
        page,
        limit,
        total: Number(countResult.rows[0]?.total || 0),
      },
      clients: clientsResult.rows.map((client) => ({
        id: client.id,
        fullName: client.full_name,
        phone: client.phone || '',
        email: client.email || '',
        balance: Number(client.balance || 0),
        status: client.status,
        createdAt: client.created_at,
        lastLoginAt: null,
        nfcCard: client.card_id
          ? { cardId: client.card_id, blocked: Boolean(client.card_blocked) }
          : null,
      })),
    });
    return;
  }

  if (request.method === 'POST' && url.pathname.startsWith('/admin/clients/') && url.pathname.endsWith('/status')) {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }

    const clientId = decodeURIComponent(url.pathname.replace('/admin/clients/', '').replace('/status', '')).trim();
    const status = String(body.status || '').trim();
    if (!['active', 'blocked', 'closed'].includes(status)) {
      sendJson(response, 400, { ok: false, error: 'Statut client invalide' });
      return;
    }

    const result = await query(
      `
        UPDATE users
        SET status = $1, updated_at = NOW()
        WHERE id = $2 AND role = 'passager'
        RETURNING id, full_name, email, phone, birth_date, balance, role, status, created_at, updated_at;
      `,
      [status, clientId],
    );
    if (!result.rowCount) {
      sendJson(response, 404, { ok: false, error: 'Client introuvable' });
      return;
    }

    sendJson(response, 200, { ok: true, client: publicUser(result.rows[0]) });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/drivers/list') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }

    const search = String(body.search || '').trim();
    const status = ['active', 'pending', 'suspended', 'blocked', 'refused'].includes(body.status) ? body.status : '';
    const zone = String(body.zone || '').trim();
    const page = Math.max(1, Number.parseInt(body.page, 10) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;
    const conditions = [`u.role = 'chauffeur'`, `u.status <> 'closed'`];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(u.full_name ILIKE $${params.length} OR u.phone ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.id ILIKE $${params.length} OR d.bus_plate ILIKE $${params.length})`);
    }
    if (status) {
      params.push(status);
      conditions.push(`u.status = $${params.length}`);
    }
    if (zone) {
      params.push(`%${zone}%`);
      conditions.push(`d.route ILIKE $${params.length}`);
    }

    const where = conditions.join(' AND ');
    const [statsResult, countResult, driversResult] = await Promise.all([
      query(`
        SELECT
          COUNT(*) FILTER (WHERE status <> 'closed')::int AS total,
          COUNT(*) FILTER (WHERE status = 'active')::int AS active,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
          COUNT(*) FILTER (WHERE status = 'suspended')::int AS suspended,
          COUNT(*) FILTER (WHERE status = 'blocked')::int AS blocked
        FROM users
        WHERE role = 'chauffeur';
      `),
      query(
        `SELECT COUNT(*)::int AS total FROM users u LEFT JOIN driver_trip_settings d ON d.driver_id = u.id WHERE ${where};`,
        params,
      ),
      query(
        `
          SELECT
            u.id, u.full_name, u.phone, u.email, u.birth_date, u.balance, u.status, u.created_at,
            d.vehicle, d.bus_plate, d.route,
            COALESCE(p.total_earned, 0)::numeric AS total_earned,
            COALESCE(p.payment_count, 0)::int AS payment_count
          FROM users u
          LEFT JOIN driver_trip_settings d ON d.driver_id = u.id
          LEFT JOIN LATERAL (
            SELECT COALESCE(SUM(amount), 0) AS total_earned, COUNT(*) AS payment_count
            FROM payments
            WHERE driver_id = u.id AND status IN ('accepted', 'successful', 'success')
          ) p ON TRUE
          WHERE ${where}
          ORDER BY u.created_at DESC
          LIMIT $${params.length + 1}
          OFFSET $${params.length + 2};
        `,
        [...params, limit, offset],
      ),
    ]);

    sendJson(response, 200, {
      ok: true,
      stats: statsResult.rows[0],
      pagination: { page, limit, total: Number(countResult.rows[0]?.total || 0) },
      drivers: driversResult.rows.map((driver) => ({
        id: driver.id,
        fullName: driver.full_name,
        phone: driver.phone || '',
        email: driver.email || '',
        birthDate: driver.birth_date || '',
        balance: Number(driver.balance || 0),
        status: driver.status,
        createdAt: driver.created_at,
        vehicle: driver.vehicle || null,
        busPlate: driver.bus_plate || null,
        route: driver.route || null,
        withdrawalOperator: null,
        totalEarned: Number(driver.total_earned || 0),
        paymentCount: Number(driver.payment_count || 0),
      })),
    });
    return;
  }

  if (request.method === 'POST' && url.pathname.startsWith('/admin/drivers/') && url.pathname.endsWith('/status')) {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }
    const driverId = decodeURIComponent(url.pathname.replace('/admin/drivers/', '').replace('/status', '')).trim();
    const status = String(body.status || '').trim();
    if (!['active', 'pending', 'suspended', 'blocked', 'refused', 'closed'].includes(status)) {
      sendJson(response, 400, { ok: false, error: 'Statut chauffeur invalide' });
      return;
    }
    const result = await query(
      `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 AND role = 'chauffeur' RETURNING *;`,
      [status, driverId],
    );
    if (!result.rowCount) {
      sendJson(response, 404, { ok: false, error: 'Chauffeur introuvable' });
      return;
    }
    sendJson(response, 200, { ok: true, driver: publicUser(result.rows[0]) });
    return;
  }

  if (request.method === 'POST' && url.pathname.startsWith('/admin/drivers/') && url.pathname.endsWith('/update')) {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }
    const driverId = decodeURIComponent(url.pathname.replace('/admin/drivers/', '').replace('/update', '')).trim();
    const fullName = String(body.fullName || '').trim();
    const email = normalizeEmail(body.email);
    const phone = normalizePhone(body.phone);
    const vehicle = String(body.vehicle || '').trim();
    const busPlate = String(body.busPlate || '').trim();
    const route = String(body.route || '').trim();
    if (!fullName || !phone) {
      sendJson(response, 400, { ok: false, error: 'Nom et téléphone obligatoires' });
      return;
    }

    const driverResult = await query(
      `
        UPDATE users
        SET full_name = $1, email = NULLIF($2, ''), phone = $3, updated_at = NOW()
        WHERE id = $4 AND role = 'chauffeur'
        RETURNING *;
      `,
      [fullName, email, phone, driverId],
    );
    if (!driverResult.rowCount) {
      sendJson(response, 404, { ok: false, error: 'Chauffeur introuvable' });
      return;
    }
    await query(
      `
        INSERT INTO driver_trip_settings (driver_id, vehicle, bus_plate, route, amount, updated_at)
        VALUES ($1, $2, $3, $4, 0, NOW())
        ON CONFLICT (driver_id)
        DO UPDATE SET vehicle = EXCLUDED.vehicle, bus_plate = EXCLUDED.bus_plate, route = EXCLUDED.route, updated_at = NOW();
      `,
      [driverId, vehicle, busPlate, route],
    );
    sendJson(response, 200, { ok: true, driver: publicUser(driverResult.rows[0]) });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/agents/list') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }
    const search = String(body.search || '').trim();
    const status = ['active', 'pending', 'inactive', 'blocked'].includes(body.status) ? body.status : '';
    const zone = String(body.zone || '').trim();
    const agentRole = String(body.agentRole || '').trim();
    const manager = String(body.manager || '').trim();
    const page = Math.max(1, Number.parseInt(body.page, 10) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;
    const conditions = [`u.role = 'agent'`, `u.status <> 'closed'`];
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(u.full_name ILIKE $${params.length} OR u.phone ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.id ILIKE $${params.length})`);
    }
    if (status) {
      params.push(status);
      conditions.push(`u.status = $${params.length}`);
    }
    if (zone) {
      params.push(`%${zone}%`);
      conditions.push(`a.assignment_zone ILIKE $${params.length}`);
    }
    if (agentRole) {
      params.push(`%${agentRole}%`);
      conditions.push(`a.agent_role ILIKE $${params.length}`);
    }
    if (manager) {
      params.push(`%${manager}%`);
      conditions.push(`a.manager_name ILIKE $${params.length}`);
    }
    const where = conditions.join(' AND ');
    const [statsResult, countResult, agentsResult] = await Promise.all([
      query(`
        SELECT
          COUNT(*) FILTER (WHERE status <> 'closed')::int AS total,
          COUNT(*) FILTER (WHERE status = 'active')::int AS active,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
          COUNT(*) FILTER (WHERE status = 'inactive')::int AS inactive,
          COUNT(*) FILTER (WHERE status = 'blocked')::int AS blocked
        FROM users WHERE role = 'agent';
      `),
      query(`SELECT COUNT(*)::int AS total FROM users u LEFT JOIN agent_profiles a ON a.agent_id = u.id WHERE ${where};`, params),
      query(
        `
          SELECT u.id, u.full_name, u.phone, u.email, u.balance, u.status, u.created_at,
                 a.assignment_zone, a.manager_name, COALESCE(a.agent_role, 'Agent terrain') AS agent_role
          FROM users u
          LEFT JOIN agent_profiles a ON a.agent_id = u.id
          WHERE ${where}
          ORDER BY u.created_at DESC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2};
        `,
        [...params, limit, offset],
      ),
    ]);
    sendJson(response, 200, {
      ok: true,
      stats: statsResult.rows[0],
      pagination: { page, limit, total: Number(countResult.rows[0]?.total || 0) },
      agents: agentsResult.rows.map((agent) => ({
        id: agent.id,
        fullName: agent.full_name,
        phone: agent.phone || '',
        email: agent.email || '',
        balance: Number(agent.balance || 0),
        status: agent.status,
        createdAt: agent.created_at,
        lastLoginAt: null,
        assignmentZone: agent.assignment_zone || null,
        managerName: agent.manager_name || null,
        agentRole: agent.agent_role || 'Agent terrain',
      })),
    });
    return;
  }

  if (request.method === 'POST' && url.pathname.startsWith('/admin/agents/') && url.pathname.endsWith('/status')) {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }
    const agentId = decodeURIComponent(url.pathname.replace('/admin/agents/', '').replace('/status', '')).trim();
    const status = String(body.status || '').trim();
    if (!['active', 'pending', 'inactive', 'blocked', 'closed'].includes(status)) {
      sendJson(response, 400, { ok: false, error: 'Statut agent invalide' });
      return;
    }
    const result = await query(`UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 AND role = 'agent' RETURNING *;`, [status, agentId]);
    if (!result.rowCount) {
      sendJson(response, 404, { ok: false, error: 'Agent introuvable' });
      return;
    }
    sendJson(response, 200, { ok: true, agent: publicUser(result.rows[0]) });
    return;
  }

  if (request.method === 'POST' && url.pathname.startsWith('/admin/agents/') && url.pathname.endsWith('/update')) {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }
    const agentId = decodeURIComponent(url.pathname.replace('/admin/agents/', '').replace('/update', '')).trim();
    const fullName = String(body.fullName || '').trim();
    const email = normalizeEmail(body.email);
    const phone = normalizePhone(body.phone);
    const assignmentZone = String(body.assignmentZone || '').trim();
    const managerName = String(body.managerName || '').trim();
    const agentRole = String(body.agentRole || 'Agent terrain').trim();
    if (!fullName || !phone) {
      sendJson(response, 400, { ok: false, error: 'Nom et téléphone obligatoires' });
      return;
    }
    const agentResult = await query(
      `UPDATE users SET full_name = $1, email = NULLIF($2, ''), phone = $3, updated_at = NOW() WHERE id = $4 AND role = 'agent' RETURNING *;`,
      [fullName, email, phone, agentId],
    );
    if (!agentResult.rowCount) {
      sendJson(response, 404, { ok: false, error: 'Agent introuvable' });
      return;
    }
    await query(
      `
        INSERT INTO agent_profiles (agent_id, assignment_zone, manager_name, agent_role, updated_at)
        VALUES ($1, NULLIF($2, ''), NULLIF($3, ''), $4, NOW())
        ON CONFLICT (agent_id) DO UPDATE SET assignment_zone = EXCLUDED.assignment_zone,
          manager_name = EXCLUDED.manager_name, agent_role = EXCLUDED.agent_role, updated_at = NOW();
      `,
      [agentId, assignmentZone, managerName, agentRole],
    );
    sendJson(response, 200, { ok: true, agent: publicUser(agentResult.rows[0]) });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/auth/reset-password') {
    const body = await readJson(request);
    const contact = normalizeContact(body.contact);
    const password = String(body.password || '');

    if (!contact || !body.code || password.length < 4) {
      sendJson(response, 400, { ok: false, error: 'Contact, code et mot de passe obligatoires' });
      return;
    }

    await verifyCode(contact, body.code, 'reset');
    const result = await query(
      `
        UPDATE users
        SET password_hash = $2, updated_at = NOW()
        WHERE LOWER(email) = LOWER($1) OR phone = $1 OR LOWER(id) = LOWER($1)
        RETURNING *;
      `,
      [contact, hashPassword(password)],
    );

    if (!result.rowCount) {
      sendJson(response, 404, { ok: false, error: 'Compte introuvable' });
      return;
    }

    sendJson(response, 200, { ok: true, user: publicUser(result.rows[0]) });
    return;
  }

  if (request.method === 'GET' && url.pathname.startsWith('/admin/clients/')) {
    const clientId = decodeURIComponent(url.pathname.replace('/admin/clients/', '')).trim();
    const result = await query(
      `
        SELECT u.*, c.card_id, c.blocked AS nfc_blocked
        FROM users u
        LEFT JOIN nfc_cards c ON c.client_id = u.id
        WHERE LOWER(u.id) = LOWER($1)
          AND u.role = 'passager'
        LIMIT 1;
      `,
      [clientId],
    );

    const user = result.rows[0];
    if (!user) {
      sendJson(response, 404, { ok: false, error: 'Client introuvable' });
      return;
    }

    sendJson(response, 200, {
      ok: true,
      client: {
        ...publicUser(user),
        nfcCardId: user.card_id || null,
        nfcCardBlocked: Boolean(user.nfc_blocked),
      },
    });
    return;
  }

  if (request.method === 'POST' && url.pathname.startsWith('/admin/clients/') && url.pathname.endsWith('/update')) {
    const clientId = decodeURIComponent(url.pathname.replace('/admin/clients/', '').replace('/update', '')).trim();
    const body = await readJson(request);
    const fullName = String(body.fullName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const birthDate = String(body.birthDate || '').trim();

    if (!clientId || !fullName || !birthDate) {
      sendJson(response, 400, { ok: false, error: 'ID, nom complet et date de naissance obligatoires' });
      return;
    }

    if (email) {
      const existingEmail = await query(
        `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1;`,
        [email, clientId],
      );
      if (existingEmail.rowCount) {
        sendJson(response, 409, { ok: false, error: 'Cette adresse email est déjà utilisée' });
        return;
      }
    }

    if (phone) {
      const existingPhone = await query(
        `SELECT id FROM users WHERE phone = $1 AND id <> $2 LIMIT 1;`,
        [phone, clientId],
      );
      if (existingPhone.rowCount) {
        sendJson(response, 409, { ok: false, error: 'Ce numéro est déjà utilisé' });
        return;
      }
    }

    const result = await query(
      `
        UPDATE users
        SET full_name = $2,
            email = NULLIF($3, ''),
            phone = NULLIF($4, ''),
            birth_date = $5,
            updated_at = NOW()
        WHERE id = $1
          AND role = 'passager'
        RETURNING *;
      `,
      [clientId, fullName, email, phone, birthDate],
    );

    if (!result.rowCount) {
      sendJson(response, 404, { ok: false, error: 'Client introuvable' });
      return;
    }

    await createNotification({
      clientId,
      title: 'Données mises à jour',
      message: 'Vos informations personnelles ont été mises à jour par l’administrateur.',
      type: 'recharge',
    });

    sendJson(response, 200, { ok: true, client: publicUser(result.rows[0]) });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/clients/profile') {
    const body = await readJson(request);
    const clientId = String(body.clientId || '').trim();
    const email = normalizeContact(body.email || '');
    const phone = normalizeContact(body.phone || '');
    const result = await query(
      `SELECT u.*, c.card_id, c.blocked AS nfc_blocked
       FROM users u
       LEFT JOIN nfc_cards c ON c.client_id = u.id
       WHERE u.role = 'passager' AND (
         ($1 <> '' AND u.id = $1) OR
         ($2 <> '' AND LOWER(COALESCE(u.email, '')) = $2) OR
         ($3 <> '' AND REPLACE(COALESCE(u.phone, ''), ' ', '') = $3)
       )
       ORDER BY CASE WHEN u.id = $1 THEN 0 ELSE 1 END
       LIMIT 1`,
      [clientId, email, phone],
    );
    if (!result.rowCount) {
      sendJson(response, 404, { ok: false, error: 'Client introuvable' });
      return;
    }
    const client = result.rows[0];
    sendJson(response, 200, {
      ok: true,
      client: {
        ...publicUser(client),
        nfcCardId: client.card_id || null,
        nfcCardBlocked: Boolean(client.nfc_blocked),
      },
    });
    return;
  }

  if (request.method === 'GET' && url.pathname.startsWith('/clients/') && !url.pathname.includes('/nfc-card')) {
    const clientId = decodeURIComponent(url.pathname.replace('/clients/', '')).trim();
    const result = await query(
      `
        SELECT u.*, c.card_id, c.blocked AS nfc_blocked
        FROM users u
        LEFT JOIN nfc_cards c ON c.client_id = u.id
        WHERE u.id = $1
          AND u.role = 'passager'
        LIMIT 1;
      `,
      [clientId],
    );

    if (!result.rowCount) {
      sendJson(response, 404, { ok: false, error: 'Client introuvable' });
      return;
    }

    const client = result.rows[0];
    sendJson(response, 200, {
      ok: true,
      client: {
        ...publicUser(client),
        nfcCardId: client.card_id || null,
        nfcCardBlocked: Boolean(client.nfc_blocked),
      },
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/admin/users/pending') {
    const role = String(url.searchParams.get('role') || '').trim();
    const params = [];
    let roleFilter = '';

    if (role) {
      params.push(role);
      roleFilter = 'AND role = $1';
    }

    const result = await query(
      `
        SELECT *
        FROM users
        WHERE status = 'pending'
          AND role IN ('chauffeur', 'agent')
          ${roleFilter}
        ORDER BY created_at DESC
        LIMIT 100;
      `,
      params,
    );

    sendJson(response, 200, {
      ok: true,
      users: result.rows.map(publicUser),
    });
    return;
  }

  if (request.method === 'POST' && url.pathname.startsWith('/admin/users/') && url.pathname.endsWith('/approve')) {
    const userId = decodeURIComponent(url.pathname.replace('/admin/users/', '').replace('/approve', '')).trim();
    const result = await query(
      `
        UPDATE users
        SET status = 'active', updated_at = NOW()
        WHERE id = $1 AND role IN ('chauffeur', 'agent')
        RETURNING *;
      `,
      [userId],
    );

    if (!result.rowCount) {
      sendJson(response, 404, { ok: false, error: 'Compte à valider introuvable' });
      return;
    }

    sendJson(response, 200, { ok: true, user: publicUser(result.rows[0]) });
    return;
  }

  if (request.method === 'POST' && url.pathname.startsWith('/admin/agents/') && url.pathname.endsWith('/recharge')) {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }
    const agentId = decodeURIComponent(url.pathname.replace('/admin/agents/', '').replace('/recharge', '')).trim();
    const amount = Number(body.amount);

    if (!agentId || !Number.isFinite(amount) || amount <= 0) {
      sendJson(response, 400, { ok: false, error: 'ID agent et montant obligatoires' });
      return;
    }

    const agentResult = await query(
      `
        UPDATE users
        SET balance = balance + $2, updated_at = NOW()
        WHERE id = $1 AND role = 'agent' AND status = 'active'
        RETURNING *;
      `,
      [agentId, amount],
    );

    const agent = agentResult.rows[0];
    if (!agent) {
      sendJson(response, 404, { ok: false, error: 'Agent actif introuvable' });
      return;
    }

    const rechargeId = `agent_float_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const paymentResult = await query(
      `
        INSERT INTO payments (id, amount, method, client_id, driver_id, bus_plate, route, status, created_at)
        VALUES ($1, $2, 'agent_float_recharge', NULL, $3, NULL, 'Crédit agent administrateur', 'accepted', NOW())
        RETURNING id, amount, method, driver_id, status, created_at;
      `,
      [rechargeId, amount, agentId],
    );

    sendJson(response, 201, {
      ok: true,
      agent: publicUser(agent),
      recharge: paymentResult.rows[0],
    });
    return;
  }

  if (request.method === 'GET' && url.pathname.startsWith('/agents/')) {
    const agentId = decodeURIComponent(url.pathname.replace('/agents/', '')).trim();
    const result = await query(
      `
        SELECT *
        FROM users
        WHERE id = $1 AND role = 'agent'
        LIMIT 1;
      `,
      [agentId],
    );

    const agent = result.rows[0];
    if (!agent) {
      sendJson(response, 404, { ok: false, error: 'Compte agent introuvable' });
      return;
    }

    const statsResult = await query(
      `
        SELECT
          COUNT(*)::int AS transaction_count,
          COALESCE(SUM(amount), 0)::numeric AS volume,
          MAX(created_at) AS last_activity
        FROM payments
        WHERE driver_id = $1
          AND method IN ('internal_recharge', 'agent_float_recharge');
      `,
      [agentId],
    );

    const transactionsResult = await query(
      `
        SELECT id, amount, method, client_id, route, status, created_at
        FROM payments
        WHERE driver_id = $1
          AND method IN ('internal_recharge', 'agent_float_recharge')
        ORDER BY created_at DESC
        LIMIT 20;
      `,
      [agentId],
    );

    sendJson(response, 200, {
      ok: true,
      agent: publicUser(agent),
      stats: {
        transactionCount: Number(statsResult.rows[0]?.transaction_count || 0),
        volume: Number(statsResult.rows[0]?.volume || 0),
        lastActivity: statsResult.rows[0]?.last_activity || null,
      },
      transactions: transactionsResult.rows,
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/clients/nfc-card') {
    const body = await readJson(request);
    const clientId = String(body.clientId || '').trim();
    const cardId = String(body.cardId || '').trim();

    if (!clientId || !cardId) {
      sendJson(response, 400, { ok: false, error: 'clientId et cardId sont obligatoires' });
      return;
    }

    const result = await query(
      `
        INSERT INTO nfc_cards (client_id, card_id, blocked, updated_at)
        VALUES ($1, $2, FALSE, NOW())
        ON CONFLICT (client_id)
        DO UPDATE SET card_id = EXCLUDED.card_id, blocked = FALSE, updated_at = NOW()
        RETURNING client_id, card_id, blocked, updated_at;
      `,
      [clientId, cardId],
    );

    await createNotification({
      clientId,
      title: 'Carte NFC activée',
      message: 'Votre carte NFC est prête pour le transport.',
      type: 'nfc',
    });
    await createAdminActivity({ eventType: 'nfc_card', title: 'Carte NFC activée', message: `La carte ${cardId} a été activée pour le client ${clientId}.`, userId: clientId, userName: clientId });

    sendJson(response, 200, { ok: true, card: result.rows[0] });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/clients/nfc-card/block') {
    const body = await readJson(request);
    const clientId = String(body.clientId || '').trim();
    const blocked = Boolean(body.blocked);

    const result = await query(
      `
        UPDATE nfc_cards
        SET blocked = $2, updated_at = NOW()
        WHERE client_id = $1
        RETURNING client_id, card_id, blocked, updated_at;
      `,
      [clientId, blocked],
    );

    if (!result.rowCount) {
      sendJson(response, 404, { ok: false, error: 'Carte introuvable' });
      return;
    }

    await createNotification({
      clientId,
      title: blocked ? 'Carte bloquée' : 'Carte débloquée',
      message: blocked ? 'Votre carte NFC ne peut plus payer.' : 'Votre carte NFC peut de nouveau payer.',
      type: 'nfc',
    });
    await createAdminActivity({ eventType: 'nfc_card', title: blocked ? 'Carte NFC bloquée' : 'Carte NFC débloquée', message: `La carte du client ${clientId} a été ${blocked ? 'bloquée' : 'débloquée'}.`, userId: clientId, userName: clientId });

    sendJson(response, 200, { ok: true, card: result.rows[0] });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/drivers/trip-settings') {
    const body = await readJson(request);
    const driverId = String(body.driverId || 'driver-demo').trim();
    const busPlate = String(body.busPlate || body.bus || '').trim();
    const route = String(body.route || '').trim();
    const amount = Number(body.amount);

    if (!driverId || !busPlate || !route || !Number.isFinite(amount) || amount <= 0) {
      sendJson(response, 400, { ok: false, error: 'Plaque, trajet et montant obligatoires' });
      return;
    }

    const result = await query(
      `
        INSERT INTO driver_trip_settings (driver_id, bus_plate, route, amount, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (driver_id)
        DO UPDATE SET bus_plate = EXCLUDED.bus_plate, route = EXCLUDED.route, amount = EXCLUDED.amount, updated_at = NOW()
        RETURNING driver_id, bus_plate, route, amount, updated_at;
      `,
      [driverId, busPlate, route, amount],
    );

    sendJson(response, 200, { ok: true, settings: result.rows[0] });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/recharges/internal') {
    const body = await readJson(request);
    let clientId = String(body.clientId || '').trim();
    const cardId = String(body.cardId || '').trim();
    const amount = Number(body.amount);
    const agentId = String(body.agentId || 'ADMIN').trim();

    if (!clientId && cardId) {
      const cardOwner = await query('SELECT client_id FROM nfc_cards WHERE card_id = $1 LIMIT 1;', [cardId]);
      clientId = cardOwner.rows[0]?.client_id || '';
    }

    if (!clientId || !Number.isFinite(amount) || amount <= 0) {
      sendJson(response, 400, { ok: false, error: 'ID client ou carte NFC, et montant obligatoires' });
      return;
    }

    const clientResult = await query('SELECT * FROM users WHERE id = $1 LIMIT 1;', [clientId]);
    const client = clientResult.rows[0];
    if (!client) {
      sendJson(response, 404, { ok: false, error: 'Client introuvable' });
      return;
    }

    let updatedAgent = null;
    if (agentId && agentId !== 'ADMIN') {
      const agentResult = await query('SELECT * FROM users WHERE id = $1 AND role = $2 AND status = $3 LIMIT 1;', [
        agentId,
        'agent',
        'active',
      ]);
      const agent = agentResult.rows[0];

      if (!agent) {
        sendJson(response, 403, { ok: false, error: 'Compte agent invalide ou non validé' });
        return;
      }

      if (Number(agent.balance || 0) < amount) {
        sendJson(response, 402, { ok: false, error: 'Solde agent insuffisant. Contactez l’administrateur.' });
        return;
      }

      const debitResult = await query(
        `
          UPDATE users
          SET balance = balance - $2, updated_at = NOW()
          WHERE id = $1
          RETURNING *;
        `,
        [agentId, amount],
      );
      updatedAgent = debitResult.rows[0];
    }

    const rechargeId = `rch_internal_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const paymentResult = await query(
      `
        INSERT INTO payments (id, amount, method, client_id, driver_id, bus_plate, route, status, created_at)
        VALUES ($1, $2, 'internal_recharge', $3, $4, NULL, 'Recharge interne', 'accepted', NOW())
        RETURNING id, amount, method, client_id, status, created_at;
      `,
      [rechargeId, amount, clientId, agentId],
    );

    const updatedUser = await query(
      `
        UPDATE users
        SET balance = balance + $2, updated_at = NOW()
        WHERE id = $1
        RETURNING *;
      `,
      [clientId, amount],
    );

    const notification = await createNotification({
      clientId,
      title: 'Recharge interne confirmée',
      message: `${amount} FC ajouté par un agent TaKo.`,
      amount,
      type: 'recharge',
    });
    await createAdminActivity({ eventType: 'recharge', title: 'Recharge confirmée', message: `${amount} FC crédités au compte de ${client.full_name || clientId} par ${agentId}.`, amount, userId: clientId, userName: client.full_name || clientId });

    sendJson(response, 201, {
      ok: true,
      recharge: paymentResult.rows[0],
      client: publicUser(updatedUser.rows[0]),
      agent: publicUser(updatedAgent),
      notification,
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/recharges/list') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }
    const rechargeWhere = `(p.method = 'internal_recharge' OR p.route = 'Recharge interne')`;
    const [rowsResult, statsResult, trendResult] = await Promise.all([
      query(`SELECT p.id, p.amount, p.method, p.status, p.client_id AS "clientId", p.driver_id AS "agentId",
        p.created_at AS "createdAt", COALESCE(u.full_name, p.client_id, 'Client TaKo') AS "clientName",
        COALESCE(u.phone, '') AS phone
        FROM payments p LEFT JOIN users u ON u.id = p.client_id
        WHERE ${rechargeWhere} ORDER BY p.created_at DESC LIMIT 250;`),
      query(`SELECT COALESCE(SUM(amount) FILTER (WHERE status = 'accepted'), 0) AS "totalAmount",
        COUNT(*) FILTER (WHERE status = 'accepted') AS successful,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE status NOT IN ('accepted', 'pending')) AS failed,
        COUNT(*) FILTER (WHERE driver_id = 'ADMIN') AS "mobileMoney",
        COUNT(*) FILTER (WHERE driver_id <> 'ADMIN') AS agent
        FROM payments p WHERE ${rechargeWhere};`),
      query(`SELECT TO_CHAR(day, 'DD/MM') AS label, COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'accepted'), 0) AS amount
        FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') day
        LEFT JOIN payments p ON p.created_at >= day AND p.created_at < day + INTERVAL '1 day' AND ${rechargeWhere}
        GROUP BY day ORDER BY day;`),
    ]);
    sendJson(response, 200, { ok: true, recharges: rowsResult.rows, stats: statsResult.rows[0], trend: trendResult.rows });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/transactions/list') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }
    const [rowsResult, statsResult] = await Promise.all([
      query(`SELECT p.id, p.amount, p.method, p.status, p.client_id AS "clientId", p.driver_id AS "driverId",
        p.bus_plate AS "busPlate", p.route, p.created_at AS "createdAt",
        COALESCE(u.full_name, p.client_id, p.driver_id, 'Utilisateur TaKo') AS "userName",
        COALESCE(u.phone, '') AS phone,
        CASE WHEN p.method = 'internal_recharge' OR p.route = 'Recharge interne' THEN 'recharge'
          WHEN p.method = 'refund' THEN 'refund' WHEN p.method = 'payout' THEN 'payout' ELSE 'payment' END AS type
        FROM payments p LEFT JOIN users u ON u.id = p.client_id
        ORDER BY p.created_at DESC LIMIT 500;`),
      query(`SELECT COUNT(*) AS total, COALESCE(SUM(amount), 0) AS "totalAmount",
        COUNT(*) FILTER (WHERE method = 'internal_recharge' OR route = 'Recharge interne') AS recharges,
        COUNT(*) FILTER (WHERE method = 'payout') AS payouts,
        COUNT(*) FILTER (WHERE method = 'refund') AS refunds,
        COUNT(*) FILTER (WHERE method <> 'internal_recharge' AND COALESCE(route, '') <> 'Recharge interne' AND method NOT IN ('payout', 'refund')) AS payments
        FROM payments;`),
    ]);
    sendJson(response, 200, { ok: true, transactions: rowsResult.rows, stats: statsResult.rows[0] });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/payments') {
    const body = await readJson(request);
    const amount = Number(body.amount);
    const method = String(body.method || '').trim();
    let clientId = String(body.clientId || '').trim() || null;
    const cardId = String(body.cardId || '').trim() || null;
    const driverId = String(body.driverId || '').trim() || null;
    const busPlate = String(body.busPlate || body.bus || '').trim() || null;
    const route = String(body.route || '').trim() || null;

    if (!Number.isFinite(amount) || amount <= 0 || !method) {
      await createAdminActivity({ eventType: 'payment_failed', title: 'Échec de paiement', message: `Demande de paiement invalide pour ${clientId || 'un passager non identifié'}.`, amount: Number.isFinite(amount) ? amount : null, userId: clientId, userName: clientId, statusCode: 400 });
      sendJson(response, 400, { ok: false, error: 'amount et method sont obligatoires' });
      return;
    }

    if (method === 'nfc' && !clientId && cardId) {
      const cardOwner = await query('SELECT client_id FROM nfc_cards WHERE card_id = $1 LIMIT 1;', [cardId]);
      clientId = cardOwner.rows[0]?.client_id || null;
    }

    if (method === 'nfc' && clientId) {
      const card = await query('SELECT blocked FROM nfc_cards WHERE client_id = $1;', [clientId]);
      if (card.rows[0]?.blocked) {
        await createAdminActivity({ eventType: 'payment_failed', title: 'Paiement NFC refusé', message: `La carte NFC bloquée du client ${clientId} a été refusée.`, amount, userId: clientId, userName: clientId, statusCode: 403 });
        sendJson(response, 403, { ok: false, error: 'Carte NFC bloquée' });
        return;
      }
    }

    const paymentId = `pay_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const result = await query(
      `
        INSERT INTO payments (id, amount, method, client_id, driver_id, bus_plate, route, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'accepted', NOW())
        RETURNING id, amount, method, client_id, driver_id, bus_plate, route, status, created_at;
      `,
      [paymentId, amount, method, clientId, driverId, busPlate, route],
    );

    if (clientId) {
      await query('UPDATE users SET balance = balance - $2, updated_at = NOW() WHERE id = $1;', [clientId, amount]);
      await createNotification({
        clientId,
        title: 'Paiement accepté',
        message: `${amount} FC payé pour ${route || 'transport'}.`,
        amount,
        type: method,
      });
    }

    const paymentUser = clientId ? await query('SELECT full_name FROM users WHERE id = $1 LIMIT 1;', [clientId]) : null;
    const paymentUserName = paymentUser?.rows[0]?.full_name || clientId || 'Passager non identifié';
    await createAdminActivity({ eventType: 'payment', title: `Paiement ${String(method).toUpperCase()} confirmé`, message: `${amount} FC payés par ${paymentUserName}${route ? ` pour ${route}` : ''}.`, amount, userId: clientId, userName: paymentUserName });

    sendJson(response, 201, { ok: true, payment: result.rows[0] });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/business-events') {
    const body = await readJson(request);
    const definitions = {
      booking: 'Réservation de billet',
      car_rental: 'Location de voiture',
      cancellation: 'Annulation de réservation',
      withdrawal: 'Demande de retrait',
    };
    const eventType = String(body.eventType || '');
    const title = definitions[eventType];
    if (!title) {
      sendJson(response, 400, { ok: false, error: 'Type d’événement non autorisé' });
      return;
    }
    const amount = body.amount == null ? null : Number(body.amount);
    const userId = String(body.userId || '').trim() || null;
    const userName = String(body.userName || '').trim() || userId || 'Utilisateur non identifié';
    const details = String(body.details || '').trim();
    if (eventType === 'cancellation') {
      const [bookingReference = `BIL-${Date.now()}`, route = 'Trajet non renseigné'] = details.split(' · ');
      await query(`INSERT INTO cancellation_requests (id, booking_reference, client_id, client_name, route, amount, request_type, reason)
        VALUES ($1,$2,$3,$4,$5,$6,'cancellation','Demande envoyée par le client');`,
        [`CAN-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`, bookingReference, userId, userName, route, Number.isFinite(amount) ? amount : 0]);
    }
    const event = await createAdminActivity({ eventType, title, message: `${title} pour ${userName}${details ? ` · ${details}` : ''}.`, amount: Number.isFinite(amount) ? amount : null, userId, userName });
    sendJson(response, 201, { ok: true, event });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/news') {
    const result = await query(`
      SELECT id, title, content, category, image_url AS "imageUrl",
             status, publish_start AS "publishStart", publish_end AS "publishEnd",
             created_by AS "createdBy", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM news_items
      WHERE status = 'published'
        AND (publish_start IS NULL OR publish_start <= NOW())
        AND (publish_end IS NULL OR publish_end >= NOW())
      ORDER BY COALESCE(publish_start, created_at) DESC, created_at DESC;
    `);
    sendJson(response, 200, { ok: true, news: result.rows });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/cancellations/list') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) { sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' }); return; }
    const rows = await query(`SELECT id, booking_reference AS "bookingReference", client_id AS "clientId", client_name AS "clientName",
      client_phone AS "clientPhone", route, travel_date AS "travelDate", amount, request_type AS "requestType", reason,
      status, requested_at AS "requestedAt", processed_at AS "processedAt" FROM cancellation_requests ORDER BY requested_at DESC;`);
    const stats = await query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status IN ('approved','refunded')) AS approved,
      COUNT(*) FILTER (WHERE status='pending') AS pending, COUNT(*) FILTER (WHERE status='refused') AS refused,
      COALESCE(SUM(amount) FILTER (WHERE status IN ('approved','refunded')),0) AS "refundedAmount" FROM cancellation_requests;`);
    sendJson(response, 200, { ok: true, requests: rows.rows, stats: stats.rows[0] }); return;
  }
  if (request.method === 'POST' && url.pathname === '/admin/cancellations/create') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) { sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' }); return; }
    const reference=String(body.bookingReference||'').trim(), clientName=String(body.clientName||'').trim(), clientPhone=String(body.clientPhone||'').trim(), route=String(body.route||'').trim(), reason=String(body.reason||'').trim();
    const amount=Number(body.amount), travelDate=body.travelDate?new Date(body.travelDate):null, requestType=body.requestType==='refund'?'refund':'cancellation';
    if(!reference||!clientName||!route||!Number.isFinite(amount)||amount<0||(travelDate&&Number.isNaN(travelDate.getTime()))){sendJson(response,400,{ok:false,error:'Référence, client, trajet, date et montant valides sont obligatoires.'});return;}
    const id=`CAN-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const result=await query(`INSERT INTO cancellation_requests(id,booking_reference,client_name,client_phone,route,travel_date,amount,request_type,reason)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id;`,[id,reference,clientName,clientPhone,route,travelDate?travelDate.toISOString():null,amount,requestType,reason]);
    sendJson(response,201,{ok:true,request:result.rows[0]});return;
  }
  if (request.method === 'POST' && url.pathname === '/admin/cancellations/decision') {
    const body=await readJson(request);if(!verifyAdminSessionToken(body.sessionToken)){sendJson(response,401,{ok:false,error:'Session administrateur expirée'});return;}
    const id=String(body.id||'').trim(), decision=body.decision==='approved'?'refunded':body.decision==='refused'?'refused':'';
    if(!id||!decision){sendJson(response,400,{ok:false,error:'Décision invalide.'});return;}
    const item=await query(`UPDATE cancellation_requests SET status=$2,processed_at=NOW() WHERE id=$1 AND status='pending' RETURNING *;`,[id,decision]);
    if(!item.rows[0]){sendJson(response,404,{ok:false,error:'Demande introuvable ou déjà traitée.'});return;}
    if(decision==='refunded'&&item.rows[0].client_id&&Number(item.rows[0].amount)>0){await query('UPDATE users SET balance=balance+$2,updated_at=NOW() WHERE id=$1;',[item.rows[0].client_id,item.rows[0].amount]);}
    await createAdminActivity({eventType:'cancellation',title:decision==='refunded'?'Annulation remboursée':'Annulation refusée',message:`${item.rows[0].booking_reference} · ${item.rows[0].client_name}.`,amount:Number(item.rows[0].amount),userId:item.rows[0].client_id,userName:item.rows[0].client_name});
    sendJson(response,200,{ok:true});return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/schedules/list') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) { sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' }); return; }
    const rows = await query(`SELECT id, departure, arrival, departure_at AS "departureAt", agency, duration,
      price, vehicle, capacity, occupied, status, created_at AS "createdAt" FROM travel_schedules ORDER BY departure_at ASC;`);
    const stats = await query(`SELECT COUNT(*) AS total,
      COUNT(*) FILTER (WHERE departure_at::date = CURRENT_DATE) AS today,
      COUNT(*) FILTER (WHERE departure_at BETWEEN NOW() AND NOW() + INTERVAL '3 hours') AS upcoming,
      COALESCE(ROUND(AVG(CASE WHEN capacity > 0 THEN occupied * 100.0 / capacity END)), 0) AS occupancy
      FROM travel_schedules WHERE status <> 'cancelled';`);
    sendJson(response, 200, { ok: true, schedules: rows.rows, stats: stats.rows[0] }); return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/schedules/save') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) { sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' }); return; }
    const id = String(body.id || `SCH-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`).trim();
    const departure = String(body.departure || '').trim(); const arrival = String(body.arrival || '').trim();
    const agency = String(body.agency || '').trim(); const duration = String(body.duration || '').trim();
    const vehicle = String(body.vehicle || '').trim(); const departureAt = new Date(body.departureAt);
    const price = Number(body.price); const capacity = Number(body.capacity);
    const status = ['scheduled', 'ongoing', 'completed', 'cancelled'].includes(body.status) ? body.status : 'scheduled';
    if (!departure || !arrival || !agency || Number.isNaN(departureAt.getTime()) || !Number.isFinite(price) || price < 0 || !Number.isInteger(capacity) || capacity <= 0) {
      sendJson(response, 400, { ok: false, error: 'Départ, arrivée, date, agence, tarif et capacité valides sont obligatoires.' }); return;
    }
    const result = await query(`INSERT INTO travel_schedules (id,departure,arrival,departure_at,agency,duration,price,vehicle,capacity,status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO UPDATE SET departure=$2,arrival=$3,departure_at=$4,
      agency=$5,duration=$6,price=$7,vehicle=$8,capacity=$9,status=$10,updated_at=NOW()
      RETURNING id,departure,arrival,departure_at AS "departureAt",agency,duration,price,vehicle,capacity,occupied,status;`,
      [id,departure,arrival,departureAt.toISOString(),agency,duration,price,vehicle,capacity,status]);
    sendJson(response, body.id ? 200 : 201, { ok: true, schedule: result.rows[0] }); return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/schedules/status') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) { sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' }); return; }
    const id = String(body.id || '').trim(); const status = ['scheduled','ongoing','completed','cancelled'].includes(body.status) ? body.status : '';
    if (!id || !status) { sendJson(response, 400, { ok: false, error: 'Horaire ou statut invalide.' }); return; }
    const result = await query('UPDATE travel_schedules SET status=$2,updated_at=NOW() WHERE id=$1 RETURNING id,status;', [id,status]);
    if (!result.rows[0]) { sendJson(response, 404, { ok: false, error: 'Horaire introuvable.' }); return; }
    sendJson(response, 200, { ok: true, schedule: result.rows[0] }); return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/partner-agencies/list') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }
    const result = await query(`SELECT id, name, service_type AS "serviceType", cities, phone, email, status,
      sales_count AS "salesCount", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM partner_agencies ORDER BY created_at DESC;`);
    const statsResult = await query(`SELECT COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'active') AS active,
      COUNT(*) FILTER (WHERE status = 'pending') AS pending,
      COUNT(*) FILTER (WHERE status = 'inactive') AS inactive
      FROM partner_agencies;`);
    sendJson(response, 200, { ok: true, agencies: result.rows, stats: statsResult.rows[0] });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/partner-agencies/save') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }
    const id = String(body.id || `AGY-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`).trim();
    const name = String(body.name || '').trim();
    const serviceType = ['Voyage', 'Location', 'Autres'].includes(body.serviceType) ? body.serviceType : 'Voyage';
    const cities = String(body.cities || '').trim();
    const phone = String(body.phone || '').trim();
    const email = normalizeContact(body.email || '');
    const status = ['active', 'pending', 'inactive'].includes(body.status) ? body.status : 'pending';
    if (!name || !cities || !phone) {
      sendJson(response, 400, { ok: false, error: 'Nom, villes desservies et téléphone obligatoires.' });
      return;
    }
    const result = await query(`INSERT INTO partner_agencies (id, name, service_type, cities, phone, email, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO UPDATE SET name=$2, service_type=$3, cities=$4,
      phone=$5, email=$6, status=$7, updated_at=NOW()
      RETURNING id, name, service_type AS "serviceType", cities, phone, email, status,
        sales_count AS "salesCount", created_at AS "createdAt";`, [id, name, serviceType, cities, phone, email, status]);
    await createAdminActivity({ eventType: 'partner_agency', title: body.id ? 'Agence partenaire modifiée' : 'Nouvelle agence partenaire', message: `${name} · ${serviceType} · ${cities}.`, userId: id, userName: name });
    sendJson(response, body.id ? 200 : 201, { ok: true, agency: result.rows[0] });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/partner-agencies/status') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur expirée' });
      return;
    }
    const id = String(body.id || '').trim();
    const status = ['active', 'pending', 'inactive'].includes(body.status) ? body.status : '';
    if (!id || !status) { sendJson(response, 400, { ok: false, error: 'Agence ou statut invalide.' }); return; }
    const result = await query(`UPDATE partner_agencies SET status=$2, updated_at=NOW() WHERE id=$1
      RETURNING id, name, status;`, [id, status]);
    if (!result.rows[0]) { sendJson(response, 404, { ok: false, error: 'Agence introuvable.' }); return; }
    sendJson(response, 200, { ok: true, agency: result.rows[0] });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/news/list') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur invalide ou expirée' });
      return;
    }
    const result = await query(`
      SELECT id, title, content, category, image_url AS "imageUrl",
             status, publish_start AS "publishStart", publish_end AS "publishEnd",
             created_by AS "createdBy", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM news_items
      ORDER BY created_at DESC;
    `);
    sendJson(response, 200, { ok: true, news: result.rows });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/news/save') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur invalide ou expirée' });
      return;
    }
    const id = String(body.id || crypto.randomUUID());
    const title = String(body.title || '').trim();
    const content = String(body.content || '').trim();
    const category = String(body.category || 'Information').trim();
    const imageUrl = String(body.imageUrl || '').trim();
    const status = ['draft', 'published', 'archived'].includes(body.status) ? body.status : 'draft';
    const publishStart = body.publishStart || null;
    const publishEnd = body.publishEnd || null;
    if (!title || !imageUrl) {
      sendJson(response, 400, { ok: false, error: 'Le titre et l’image sont obligatoires.' });
      return;
    }
    const result = await query(`
      INSERT INTO news_items
        (id, title, content, category, image_url, status, publish_start, publish_end, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        category = EXCLUDED.category,
        image_url = EXCLUDED.image_url,
        status = EXCLUDED.status,
        publish_start = EXCLUDED.publish_start,
        publish_end = EXCLUDED.publish_end,
        updated_at = NOW()
      RETURNING id, title, content, category, image_url AS "imageUrl",
                status, publish_start AS "publishStart", publish_end AS "publishEnd",
                created_by AS "createdBy", created_at AS "createdAt", updated_at AS "updatedAt";
    `, [id, title, content, category, imageUrl, status, publishStart, publishEnd]);
    sendJson(response, body.id ? 200 : 201, { ok: true, newsItem: result.rows[0] });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/admin/news/delete') {
    const body = await readJson(request);
    if (!verifyAdminSessionToken(body.sessionToken)) {
      sendJson(response, 401, { ok: false, error: 'Session administrateur invalide ou expirée' });
      return;
    }
    const result = await query('DELETE FROM news_items WHERE id = $1 RETURNING id;', [String(body.id || '')]);
    if (!result.rowCount) {
      sendJson(response, 404, { ok: false, error: 'Actualité introuvable.' });
      return;
    }
    sendJson(response, 200, { ok: true, id: result.rows[0].id });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/payments') {
    const clientId = url.searchParams.get('clientId');
    const params = [];
    let where = '';
    if (clientId) {
      params.push(clientId);
      where = 'WHERE client_id = $1';
    }

    const result = await query(
      `
        SELECT id, amount, method, client_id, driver_id, bus_plate, route, status, created_at
        FROM payments
        ${where}
        ORDER BY created_at DESC
        LIMIT 100;
      `,
      params,
    );

    sendJson(response, 200, { ok: true, payments: result.rows });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/notifications') {
    const clientId = url.searchParams.get('clientId');
    if (!clientId) {
      sendJson(response, 400, { ok: false, error: 'clientId obligatoire' });
      return;
    }

    const result = await query(
      `
        SELECT id, title, message, amount, type, read, created_at
        FROM notifications
        WHERE client_id = $1
        ORDER BY created_at DESC
        LIMIT 100;
      `,
      [clientId],
    );

    sendJson(response, 200, { ok: true, notifications: result.rows });
    return;
  }

  sendJson(response, 404, { ok: false, error: 'Route introuvable' });
}

const server = http.createServer(async (request, response) => {
  try {
    await handleRequest(request, response);
  } catch (error) {
    console.error(error);
    await createAdminActivity({
      eventType: 'system_error',
      title: 'Erreur importante du système',
      message: `${request.method || 'REQUÊTE'} ${request.url || '/'} : ${error.publicMessage || error.message || 'Erreur serveur'}`,
      statusCode: error.statusCode || 500,
    }).catch((activityError) => console.error('Unable to record important system error:', activityError));
    sendError(response, error);
  }
});

initDatabase()
  .then(() => {
    server.listen(port, () => {
      console.log(`TaKo API running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error('Database initialization failed:', error);
    process.exit(1);
  });
