// netlify/functions/signup.js
// Creates a new user account in Neon (PostgreSQL via NETLIFY_DATABASE_URL)

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
    const { name, phone, pass } = JSON.parse(event.body || '{}');

    if (!name || !phone || !pass) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing fields' }) };
    }

    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    // Ensure users table exists
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

    // Check for duplicate phone
    const existing = await sql`SELECT id FROM users WHERE phone = ${phone}`;
    if (existing.length > 0) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'यह phone number पहले से registered है।' }),
      };
    }

    const id = 'id' + Date.now() + Math.random().toString(36).slice(2, 7);
    const createdAt = new Date().toISOString();

    await sql`
      INSERT INTO users (id, name, phone, pass, plan, pending_plan, created_at)
      VALUES (${id}, ${name}, ${phone}, ${pass}, ${null}, ${null}, ${createdAt})
    `;

    const user = { id, name, phone, pass, plan: null, pendingPlan: null, createdAt };
    return { statusCode: 200, headers, body: JSON.stringify({ user }) };

  } catch (err) {
    console.error('signup error', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server error: ' + err.message }),
    };
  }
};
