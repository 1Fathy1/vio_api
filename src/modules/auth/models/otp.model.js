async function create(database, data) {
  await database.query(
    `
      INSERT INTO otp_codes (user_id, code, purpose, expires_at)
      VALUES ($1, $2, $3, NOW() + ($4 * INTERVAL '1 minute'))
    `,
    [data.userId, data.code, data.purpose, data.ttlMinutes]
  );
}

async function findValid(database, email, code, purpose) {
  const result = await database.query(
    `
      SELECT oc.id
      FROM otp_codes oc
      JOIN users u ON u.id = oc.user_id
      WHERE u.email = $1
        AND oc.code = $2
        AND oc.purpose = $3
        AND oc.verified = FALSE
        AND oc.expires_at > NOW()
      ORDER BY oc.created_at DESC
      LIMIT 1
    `,
    [email, code, purpose]
  );
  return result.rows[0] || null;
}

async function markVerified(database, otpId) {
  await database.query("UPDATE otp_codes SET verified = TRUE WHERE id = $1", [otpId]);
}

module.exports = { create, findValid, markVerified };
