async function create(database, data) {
  await database.query(
    `
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES ($1, $2, $3)
    `,
    [data.userId, data.tokenHash, data.expiresAt]
  );
}

async function findValid(database, userId, tokenHash) {
  const result = await database.query(
    `
      SELECT id
      FROM refresh_tokens
      WHERE token_hash = $1
        AND user_id = $2
        AND revoked = FALSE
        AND expires_at > NOW()
    `,
    [tokenHash, userId]
  );
  return result.rows[0] || null;
}

async function revoke(database, tokenId) {
  await database.query("UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1", [tokenId]);
}

async function findUser(database, userId, tokenHash) {
  const result = await database.query(
    `
      SELECT u.id, u.email, u.is_active
      FROM refresh_tokens rt
      JOIN users u ON u.id = rt.user_id
      WHERE rt.token_hash = $1
        AND rt.user_id = $2
        AND rt.revoked = FALSE
        AND rt.expires_at > NOW()
    `,
    [tokenHash, userId]
  );
  return result.rows[0] || null;
}

module.exports = { create, findValid, revoke, findUser };
