import http from 'node:http';
import pg from 'pg';

const port = Number(process.env.PORT || 3000);
const databaseUrl = process.env.DATABASE_URL;

const pool = databaseUrl
  ? new pg.Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false,
      },
    })
  : null;

async function initDatabase() {
  if (!pool) {
    console.warn('DATABASE_URL missing. Server will run without PostgreSQL.');
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS clients (
      client_id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      amount NUMERIC NOT NULL,
      method TEXT NOT NULL,
      client_id TEXT,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  response.end(JSON.stringify(data));
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

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host}`);

  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  if (request.method === 'GET' && url.pathname === '/') {
    sendJson(response, 200, {
      name: 'TaKo API',
      status: 'online',
      database: pool ? 'connected' : 'disabled',
    });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/health') {
    sendJson(response, 200, {
      ok: true,
    });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/clients/nfc-card') {
    try {
      const body = await readJson(request);
      const clientId = String(body.clientId || '').trim();
      const cardId = String(body.cardId || '').trim();

      if (!clientId || !cardId) {
        sendJson(response, 400, {
          error: 'clientId et cardId sont obligatoires',
        });
        return;
      }

      if (!pool) {
        sendJson(response, 503, {
          error: 'DATABASE_URL manquant',
        });
        return;
      }

      const result = await pool.query(
        `
          INSERT INTO clients (client_id, card_id, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (client_id)
          DO UPDATE SET card_id = EXCLUDED.card_id, updated_at = NOW()
          RETURNING client_id, card_id, updated_at;
        `,
        [clientId, cardId],
      );

      sendJson(response, 200, {
        ok: true,
        client: result.rows[0],
      });
    } catch {
      sendJson(response, 400, {
        error: 'JSON invalide',
      });
    }

    return;
  }

  if (request.method === 'POST' && url.pathname === '/payments') {
    try {
      const body = await readJson(request);
      const amount = Number(body.amount);
      const method = String(body.method || '').trim();
      const clientId = String(body.clientId || '').trim();

      if (!Number.isFinite(amount) || amount <= 0 || !method) {
        sendJson(response, 400, {
          error: 'amount et method sont obligatoires',
        });
        return;
      }

      if (!pool) {
        sendJson(response, 503, {
          error: 'DATABASE_URL manquant',
        });
        return;
      }

      const payment = {
        id: `pay_${Date.now()}`,
        amount,
        method,
        clientId: clientId || null,
        status: 'accepted',
        createdAt: new Date().toISOString(),
      };

      const result = await pool.query(
        `
          INSERT INTO payments (id, amount, method, client_id, status, created_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          RETURNING id, amount, method, client_id, status, created_at;
        `,
        [payment.id, payment.amount, payment.method, payment.clientId, payment.status],
      );

      sendJson(response, 201, {
        ok: true,
        payment: result.rows[0],
      });
    } catch {
      sendJson(response, 400, {
        error: 'JSON invalide',
      });
    }

    return;
  }

  if (request.method === 'GET' && url.pathname === '/payments') {
    if (!pool) {
      sendJson(response, 503, {
        error: 'DATABASE_URL manquant',
      });
      return;
    }

    const result = await pool.query(`
      SELECT id, amount, method, client_id, status, created_at
      FROM payments
      ORDER BY created_at DESC
      LIMIT 100;
    `);

    sendJson(response, 200, {
      payments: result.rows,
    });
    return;
  }

  sendJson(response, 404, {
    error: 'Route introuvable',
  });
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
