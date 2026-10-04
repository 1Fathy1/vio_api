async function list(database, company) {
  const result = await database.query(
    `
    SELECT
      e.id,
      e.employee_id,
      e.name,
      e.job_title,
      e.status,
      e.company,
      d.id AS department_id,
      d.name AS department_name
    FROM employees e
    JOIN departments d ON d.id = e.department_id
    WHERE e.company = $1
    ORDER BY e.created_at DESC
    `,
    [company]
  );

  return result.rows;
}

async function count(database, filters) {
  const values = [filters.company];
  const conditions = ["company = $1"];
  if (filters.departmentId) { values.push(filters.departmentId); conditions.push(`department_id = $${values.length}`); }
  if (filters.status) { values.push(filters.status); conditions.push(`status = $${values.length}`); }
  const result = await database.query(
    `SELECT COUNT(*)::int AS total FROM employees ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}`,
    values
  );
  return result.rows[0].total;
}

async function findById(database, employeeId, company) {
  const result = await database.query(
    `
    SELECT
      e.*,
      d.name AS department_name,

      COALESCE(
        (
          SELECT json_agg(ed ORDER BY ed.created_at DESC)
          FROM employee_documents ed
          WHERE ed.employee_id = e.id
        ),
        '[]'
      ) AS documents,

      COALESCE(
        (
          SELECT json_agg(ec ORDER BY ec.is_primary DESC)
          FROM employee_contacts ec
          WHERE ec.employee_id = e.id
        ),
        '[]'
      ) AS contacts,

      COALESCE(
        (
          SELECT json_agg(ea ORDER BY ea.is_primary DESC)
          FROM employee_addresses ea
          WHERE ea.employee_id = e.id
        ),
        '[]'
      ) AS addresses

    FROM employees e
    JOIN departments d ON d.id = e.department_id
    WHERE e.id = $1
      AND e.company = $2
    `,
    [employeeId, company]
  );

  return result.rows[0] || null;
}

async function create(database, data) {
  const result = await database.query(
    `
    INSERT INTO employees (
      employee_id,
      department_id,
      job_title,
      name,
      company,
      phone_number,
      username,
      password,
      start_time,
      end_time,
      status
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10, $11
    )
    RETURNING *
    `,
    [
      data.employeeId,
      data.departmentId,
      data.jobTitle,
      data.name,
      data.company,
      data.phoneNumber,
      data.username,
      data.password,
      data.startTime,
      data.endTime,
      data.status
    ]
  );

  return result.rows[0];
}


async function update(database, employeeId, data, company) {
  const fields = [];
  const values = [];
  for (const [column, value] of Object.entries(data)) {
    values.push(value);
    fields.push(`${column} = $${values.length}`);
  }
  values.push(employeeId, company);
  const result = await database.query(
    `UPDATE employees SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${values.length - 1} AND company = $${values.length} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

async function deleteById(database, employeeId, company) {

  const result = await database.query(
    `DELETE FROM employees
     WHERE id = $1 AND company = $2
     RETURNING *`,
    [employeeId, company]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0];
}

async function findDepartment(database, departmentId, company) {
  const result = await database.query("SELECT id FROM departments WHERE id = $1 AND company = $2", [departmentId, company]);
  return result.rows[0] || null;
}

module.exports = { list, count, findById, create, update, deleteById, findDepartment };
