// netlify/functions/login.js
// Verifies credentials and returns the user object from Neon DB

const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const { phone, pass } = JSON.parse(event.body || '{}');

    if (!phone || !pass) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing fields' }) };
    }

    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    // Ensure the table exists (safe no-op if already present)
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        phone       TEXT UNIQUE NOT NULL,
        pass        TEXT NOT NULL,
        plan        JSONB,
        pending_plan TEXT,
        created_at  TEXT
      )
    `;

    const rows = await sql`SELECT * FROM users WHERE phone = ${phone}`;

    if (rows.length === 0) {
      // Distinguish "no account at all" vs "wrong password"
      const any = await sql`SELECT id FROM users LIMIT 1`;
      const msg = any.length === 0 ? 'पहले account बनाएं।' : 'गलत Phone number या Password।';
      return { statusCode: 401, headers, body: JSON.stringify({ error: msg }) };
    }

    const row = rows[0];

    if (row.pass !== pass) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Password गलत है।' }) };
    }

    const user = {
      id:          row.id,
      name:        row.name,
      phone:       row.phone,
      pass:        row.pass,
      plan:        row.plan        || null,
      pendingPlan: row.pending_plan || null,
      createdAt:   row.created_at,
    };

    return { statusCode: 200, headers, body: JSON.stringify({ user }) };

  } catch (err) {
    console.error('login error', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server error: ' + err.message }),
    };
  }
};
