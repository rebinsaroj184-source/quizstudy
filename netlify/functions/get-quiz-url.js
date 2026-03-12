const { neon } = require('@neondatabase/serverless');
exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  const { quizId, type, userId } = event.queryStringParameters || {};
  if (!quizId || !type) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing parameters' }) };
  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    if (type === 'premium') {
      if (!userId) return { statusCode: 401, headers, body: JSON.stringify({ error: 'LOGIN_REQUIRED' }) };
      const users = await sql`SELECT * FROM users WHERE id = ${userId}`;
      if (!users.length) return { statusCode: 401, headers, body: JSON.stringify({ error: 'USER_NOT_FOUND' }) };
      const plan = users[0].plan;
      const isActive = plan && plan.expiresAt && new Date(plan.expiresAt).getTime() > Date.now();
      if (!isActive) return { statusCode: 403, headers, body: JSON.stringify({ error: 'PREMIUM_REQUIRED' }) };
    }
    const rows = await sql`SELECT value FROM app_data WHERE key = 'main'`;
    if (!rows.length) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Data not found' }) };
    const quizArr = type === 'premium' ? (rows[0].value.premiumQuizzes || []) : (rows[0].value.quizzes || []);
    const quiz = quizArr.find(q => q.id === quizId);
    if (!quiz?.url) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Quiz not found' }) };
    return { statusCode: 200, headers, body: JSON.stringify({ url: quiz.url }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server error: ' + err.message }) };
  }
};
