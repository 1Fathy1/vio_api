async function findByEmail(database, email) {
  const result = await database.query(
    `
      SELECT u.*
      FROM users u
      WHERE u.email = $1
    `,
    [email]
  );

  return result.rows[0] || null;
}

async function findEmployee(database, username) {
  const result = await database.query(
    `
      SELECT * FROM employees where username = $1
    `,
    [username]
  );

  return result.rows[0] || null;
}

async function findIdByEmail(database, email) {
  const result = await database.query("SELECT id FROM users WHERE email = $1", [email]);
  return result.rows[0] || null;
}

async function findById(database, id) {
  const result = await database.query("SELECT * FROM users WHERE id = $1", [id]);
  return result.rows[0] || null;
}

async function create(database, data) {
  const result = await database.query(
    `
      INSERT INTO users (name, email, phone_number, password_hash, company)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, phone_number, company, is_active, is_verified, created_at
    `,
    [data.name, data.email, data.phoneNumber, data.passwordHash, data.company]
  );

  return result.rows[0];
}

async function updatePassword(database, userId, passwordHash) {
  await database.query(
    "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
    [passwordHash, userId]
  );
}

async function deleteById(database, userId, company) {
  const result = await database.query("DELETE FROM users WHERE id = $1 AND company = $2 RETURNING id", [userId, company]);
  return result.rows[0] || null;
}

async function updateDeviceRequest(
  database,
  employeeId,
  value
) {
  const result = await database.query(
    `
    UPDATE employees
    SET device_request = $1
    WHERE id = $2
    RETURNING *
    `,
    [value, employeeId]
  );

  return result.rows[0] || null;
}


module.exports = { updateDeviceRequest, findByEmail,findEmployee, findIdByEmail,findById, create, updatePassword, deleteById };
