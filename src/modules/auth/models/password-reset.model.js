async function create(database, data) {
  await database.query(
    `
      INSERT INTO password_resets (user_id, token_hash, expires_at)
      VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 minute'))
    `,
    [data.userId, data.tokenHash, data.ttlMinutes]
  );
}

async function findValid(database, userId, tokenHash) {
  const result = await database.query(
    `
      SELECT id
      FROM password_resets
      WHERE user_id = $1
        AND token_hash = $2
        AND used = FALSE
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [userId, tokenHash]
  );
  return result.rows[0] || null;
}

async function markUsed(database, resetId) {
  await database.query("UPDATE password_resets SET used = TRUE WHERE id = $1", [resetId]);
}

module.exports = { create, findValid, markUsed };
