const pool = require("./db");

async function testConnection() {
  await pool.query("SELECT 1");
}

async function getCurrentTime() {
  const result = await pool.query("SELECT NOW()");
  return result.rows[0];
}

module.exports = { testConnection, getCurrentTime };
