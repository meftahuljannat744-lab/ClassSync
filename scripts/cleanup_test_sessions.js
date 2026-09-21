const db = require('../src/config/db');

async function cleanup() {
  await db.query('UPDATE live_sessions SET is_active = false, ended_at = NOW() WHERE ended_at IS NULL');
  console.log('Cleaned up active live sessions.');
  await db.end();
}

cleanup();
