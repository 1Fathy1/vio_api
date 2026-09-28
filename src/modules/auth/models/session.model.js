async function create(database, data) {
  await database.query(
    `
      INSERT INTO sessions
        (user_id, token_hash, ip_address, user_agent, expires_at)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [data.userId, data.tokenHash, data.ipAddress, data.userAgent, data.expiresAt]
  );
}

async function deleteByToken(database, userId, tokenHash) {
  await database.query(
    "DELETE FROM sessions WHERE user_id = $1 AND token_hash = $2",
    [userId, tokenHash]
  );
}

async function deleteByUser(database, userId) {
  await database.query("DELETE FROM sessions WHERE user_id = $1", [userId]);
}

module.exports = { create, deleteByToken, deleteByUser };
