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


async function changeRequest(database, employeeId) {
  const result = await database.query(
    `
    update devices 
      set change_device = TRUE 
      where employee_id = $1 
    RETURNING *
    `,
    [employeeId]
  );

  return result.rows[0] || null;
}
async function deviceInfo(database, companyId) {
  const result = await database.query(
    `
    SELECT
    employees.id AS employee_id,
    employees.name,
    employees.status,
    employees.allow_login AS login_allow,
    devices.last_used_at,
    devices.change_device AS device_request,
    devices.id AS device_id
FROM employees
JOIN devices
    ON devices.employee_id = employees.id
where employees.company = $1;
    `,
    [companyId]
  );

  return result.rows || null;
}

async function allowLogin(database, employeeId, deviceId) {
  const employeeResult = await database.query(
    `
    UPDATE employees
    SET allow_login = TRUE
    WHERE id = $1
    RETURNING *
    `,
    [employeeId]
  );

  if (!employeeResult.rows[0]) {
    return null;
  }

  const deviceResult = await database.query(
    `
    DELETE FROM devices
    WHERE id = $1
    RETURNING *
    `,
    [deviceId]
  );

  if (!deviceResult.rows[0]) {
    return null;
  }

  return employeeResult.rows[0];
}

module.exports = {
  findByEmployeeId,
  create,
  updateLastUsedAt,
  update,
  changeRequest,
  deviceInfo,
  allowLogin
};