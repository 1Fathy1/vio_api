async function findByEmployeeId(database, employeeId) {
  const result = await database.query(
    `
    SELECT *
    FROM devices
    WHERE employee_id = $1
    LIMIT 1
    `,
    [employeeId]
  );

  return result.rows[0] || null;
}

async function create(database, data) {
  const result = await database.query(
    `
    INSERT INTO devices (
      employee_id,
      device_identifier,
      device_name
    )
    VALUES (
      $1,
      $2,
      $3
    )
    RETURNING *
    `,
    [
      data.employeeId,
      data.deviceIdentifier,
      data.deviceName,
    ]
  );

  return result.rows[0];
}

async function updateLastUsedAt(database, employeeId) {
  const result = await database.query(
    `
    UPDATE devices
    SET last_used_at = NOW()
    WHERE employee_id = $1
    RETURNING *
    `,
    [employeeId]
  );

  return result.rows[0] || null;
}

async function update(database, employeeId, data) {
  const result = await database.query(
    `
    UPDATE devices
    SET
      device_identifier = $1,
      device_name = $2,
      last_used_at = NOW()
    WHERE employee_id = $3
    RETURNING *
    `,
    [
      data.deviceIdentifier,
      data.deviceName,
      employeeId,
    ]
  );

  return result.rows[0] || null;
}

module.exports = {
  findByEmployeeId,
  create,
  updateLastUsedAt,
  update,
};