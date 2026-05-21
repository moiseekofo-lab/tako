import crypto from 'node:crypto';
import http from 'node:http';
import pg from 'pg';

const port = Number(process.env.PORT || 3000);
const databaseUrl = process.env.DATABASE_URL;
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
const adminEmail = (process.env.ADMIN_EMAIL || 'contact@takotransport.online').trim().toLowerCase();
const sendGridApiKey = process.env.SENDGRID_API_KEY;
const sendGridFromEmail = process.env.SENDGRID_FROM_EMAIL;
const sendGridFromName = process.env.SENDGRID_FROM_NAME || 'TaKo';
const maishaPayEndpoint =
  process.env.MAISHA_PAY_ENDPOINT || 'https://marchand.maishapay.online/api/payment/rest/vers1.0/merchant';
const maishaPayGatewayMode = Number(process.env.MAISHA_PAY_GATEWAY_MODE || 0);
const maishaPayPublicApiKey = process.env.MAISHA_PAY_PUBLIC_API_KEY;
const maishaPaySecretApiKey = process.env.MAISHA_PAY_SECRET_API_KEY;
const maishaPayCurrency = process.env.MAISHA_PAY_CURRENCY || 'CDF';

const pool = databaseUrl
  ? new pg.Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    })
  : null;

function nowIso() {
  return new Date().toISOString();
}

function normalizeContact(value = '') {
  const clean = String(value).trim().toLowerCase();
  if (clean.includes('@')) {
    return clean;
  }

  return clean.replace(/\s+/g, '');
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
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

async function sendVerificationEmail(contact, code, purpose) {
  if (!sendGridApiKey || !sendGridFromEmail || !contact.includes('@')) {
    return false;
  }

  const subject =
    purpose === 'reset'
      ? 'Code de récupération TaKo'
      : 'Code de confirmation TaKo';
  const title =
    purpose === 'reset'
      ? 'Récupération de votre compte TaKo'
      : 'Confirmation de votre compte TaKo';
  const text = `${title}\n\nVotre code est : ${code}\n\nCe code expire dans 10 minutes.`;
  const html = `
    <div style="font-family:Arial,sans-serif;color:#202836;line-height:1.5">
      <h2 style="color:#061F68">${title}</h2>
      <p>Votre code est :</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:4px;color:#139DFF">${code}</p>
      <p>Ce code expire dans 10 minutes.</p>
      <p style="color:#6b7280">Si vous n’avez pas demandé ce code, ignorez cet email.</p>
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
          to: [{ email: contact }],
          subject,
        },
      ],
      from: {
        email: sendGridFromEmail,
        name: sendGridFromName,
      },
      content: [
        { type: 'text/plain', value: text },
        { type: 'text/html', value: html },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error('SendGrid failed:', response.status, errorText);
    return false;
  }

  return true;
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
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
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
      SELECT *
      FROM users
      WHERE LOWER(id) = LOWER($1)
         OR LOWER(email) = LOWER($1)
         OR phone = $1
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
    createdAt: user.created_at,
  };
}

function normalizeMobileMoneyProvider(provider = '') {
  const value = String(provider).trim().toUpperCase().replace(/\s+/g, '');

  if (value.includes('MPESA') || value.includes('M-PESA')) {
    return 'MPESA';
  }

  if (value.includes('ORANGE')) {
    return 'ORANGE';
  }

  if (value.includes('AIRTEL')) {
    return 'AIRTEL';
  }

  if (value.includes('AFRICEL')) {
    return 'AFRICEL';
  }

  if (value.includes('MTN')) {
    return 'MTN';
  }

  return value;
}

function normalizeWalletId(walletId = '') {
  const clean = String(walletId).trim().replace(/\s+/g, '');
  if (!clean) {
    return '';
  }

  if (clean.startsWith('+')) {
    return clean;
  }

  if (clean.startsWith('243')) {
    return `+${clean}`;
  }

  if (clean.startsWith('0')) {
    return `+243${clean.slice(1)}`;
  }

  return clean;
}

function extractMaishaPayData(data = {}) {
  return data.original?.data || data.data || data;
}

function extractMaishaPayMessage(data = {}) {
  const extracted = extractMaishaPayData(data);
  return (
    extracted.statusDescription ||
    extracted.description ||
    extracted.title ||
    extracted.message ||
    data.description ||
    data.title ||
    data.message ||
    data.error ||
    data.exception ||
    'MaishaPay a refusé la demande de recharge'
  );
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

async function handleRequest(request, response) {
  const url = new URL(request.url ?? '/', `http://${request.headers.host}`);

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

  if (request.method === 'POST' && url.pathname === '/auth/request-code') {
    const body = await readJson(request);
    const contact = normalizeContact(body.contact);
    const purpose = String(body.purpose || 'register');

    if (!contact) {
      sendJson(response, 400, { ok: false, error: 'Email ou numéro obligatoire' });
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

    const emailSent = await sendVerificationEmail(contact, code, purpose);

    sendJson(response, 200, {
      ok: true,
      message: emailSent ? 'Code envoyé par email' : 'Code généré',
      delivery: emailSent ? 'email' : 'demo',
      ...(emailSent ? {} : { code }),
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

    await verifyStoredCode(contact, body.code, purpose, false);
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

    sendJson(response, 200, {
      ok: true,
      message: 'Code envoyé au numéro du client',
      delivery: 'sms-pending',
      code,
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

    await verifyStoredCode(phone, code, 'prepaid-card');

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

    await verifyStoredCode(contact, body.code, 'register');

    const id = await generateUniqueClientId();
    const email = contact.includes('@') ? contact : null;
    const phone = contact.includes('@') ? null : contact;
    const status = role === 'chauffeur' || role === 'agent' ? 'pending' : 'active';

    const result = await query(
      `
        INSERT INTO users (id, full_name, email, phone, birth_date, password_hash, role, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `,
      [id, fullName, email, phone, birthDate, hashPassword(password), role, status],
    );
    const accountEmailSent = await sendAccountCreatedEmail(result.rows[0]);

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

    if (login.toLowerCase() !== adminEmail || password !== adminPassword) {
      sendJson(response, 401, { ok: false, error: 'Accès administrateur refusé' });
      return;
    }

    sendJson(response, 200, {
      ok: true,
      user: {
        id: 'ADMIN',
        fullName: 'Administrateur TaKo',
        email: adminEmail,
        phone: '',
        birthDate: '',
        role: 'admin',
        status: 'active',
        balance: 0,
      },
    });
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

    await verifyStoredCode(contact, body.code, 'reset');
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

  if (request.method === 'GET' && url.pathname.startsWith('/clients/') && !url.pathname.includes('/nfc-card')) {
    const clientId = decodeURIComponent(url.pathname.replace('/clients/', '')).trim();
    const result = await query(
      `
        SELECT *
        FROM users
        WHERE id = $1
          AND role = 'passager'
        LIMIT 1;
      `,
      [clientId],
    );

    if (!result.rowCount) {
      sendJson(response, 404, { ok: false, error: 'Client introuvable' });
      return;
    }

    sendJson(response, 200, { ok: true, client: publicUser(result.rows[0]) });
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

  if (request.method === 'POST' && url.pathname === '/recharges/mobile-money') {
    const body = await readJson(request);
    const amount = Number(body.amount);
    const clientId = String(body.clientId || '').trim() || null;
    let storedClientId = clientId;
    const provider = String(body.provider || '').trim();
    const operator = normalizeMobileMoneyProvider(provider);
    const walletId = normalizeWalletId(body.walletId);
    const customerFullName = String(body.customerFullName || 'Client TaKo').trim();
    const customerEmailAddress = String(body.customerEmailAddress || adminEmail).trim();

    if (!Number.isFinite(amount) || amount <= 0 || !operator || !walletId) {
      sendJson(response, 400, { ok: false, error: 'Montant, opérateur et numéro mobile money obligatoires' });
      return;
    }

    if (!maishaPayPublicApiKey || !maishaPaySecretApiKey) {
      sendJson(response, 503, {
        ok: false,
        error: 'Configuration MaishaPay manquante sur Render',
      });
      return;
    }

    if (storedClientId) {
      const clientResult = await query('SELECT id FROM users WHERE id = $1 LIMIT 1;', [storedClientId]);
      if (!clientResult.rowCount) {
        storedClientId = null;
      }
    }

    const transactionReference = `TAKO-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const payload = {
      publicApiKey: maishaPayPublicApiKey,
      secretApiKey: maishaPaySecretApiKey,
      gatewayMode: maishaPayGatewayMode,
      transactionReference,
      amount,
      currency: maishaPayCurrency,
      chanel: 'MOBILEMONEY',
      provider: operator,
      customerFullName,
      customerPhoneNumber: walletId,
      customerEmailAddress,
      walletID: walletId,
    };

    const maishaResponse = await fetch(maishaPayEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseText = await maishaResponse.text();
    let providerData = {};
    try {
      providerData = responseText ? JSON.parse(responseText) : {};
    } catch {
      providerData = { message: responseText };
    }

    const extractedProviderData = extractMaishaPayData(providerData);
    const providerStatus = Number(extractedProviderData.statusCode || extractedProviderData.status || maishaResponse.status);
    const accepted = maishaResponse.ok && (providerStatus === 202 || providerStatus === 200);

    if (!accepted) {
      console.error('MaishaPay recharge refused:', {
        httpStatus: maishaResponse.status,
        providerStatus,
        providerMessage: extractMaishaPayMessage(providerData),
        providerData,
      });
      sendJson(response, 502, {
        ok: false,
        error: extractMaishaPayMessage(providerData),
        status: providerStatus,
        providerResponse: providerData,
      });
      return;
    }

    const rechargeId = `rch_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const paymentResult = await query(
      `
        INSERT INTO payments (id, amount, method, client_id, driver_id, bus_plate, route, status, created_at)
        VALUES ($1, $2, 'mobile_money', $3, NULL, $4, $5, 'pending', NOW())
        RETURNING id, amount, method, client_id, status, created_at;
      `,
      [
        rechargeId,
        amount,
        storedClientId,
        operator,
        transactionReference,
      ],
    );

    if (storedClientId) {
      await createNotification({
        clientId: storedClientId,
        title: 'Recharge demandée',
        message: `Recharge ${provider} de ${amount} FC en attente de confirmation.`,
        amount,
        type: 'recharge',
      });
    }

    sendJson(response, 202, {
      ok: true,
      recharge: {
        ...paymentResult.rows[0],
        provider,
        operator,
        currency: maishaPayCurrency,
        walletId,
        transactionReference,
        providerTransactionId: extractedProviderData.transactionId || null,
        providerResponse: providerData,
      },
    });
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

    sendJson(response, 201, {
      ok: true,
      recharge: paymentResult.rows[0],
      client: publicUser(updatedUser.rows[0]),
      agent: publicUser(updatedAgent),
      notification,
    });
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

    sendJson(response, 201, { ok: true, payment: result.rows[0] });
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
