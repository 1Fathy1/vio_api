async function findLatest(database, limit) {
  const result = await database.query(
    `
      SELECT id, action, details, created_at
      FROM activity_logs
      ORDER BY created_at DESC
      LIMIT $1
    `,
    [limit]
  );

  return result.rows;
}

module.exports = { findLatest };
