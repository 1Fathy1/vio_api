async function list(database, company) {
  const result = await database.query(
    `SELECT d.*, COUNT(e.id)::int AS employee_count
    FROM departments d LEFT JOIN employees e ON e.department_id = d.id AND e.company = d.company
    WHERE d.company = $1
     GROUP BY d.id ORDER BY d.name`
      , [company]
  );
  return result.rows;
}

async function findById(database, id, company) {
  const result = await database.query(
    `SELECT d.*, COALESCE(json_agg(e) FILTER (WHERE e.id IS NOT NULL), '[]') AS employees
    FROM departments d LEFT JOIN employees e ON e.department_id = d.id AND e.company = d.company
    WHERE d.id = $1 AND d.company = $2 GROUP BY d.id`, [id, company]
  );
  return result.rows[0] || null;
}

async function create(database, data, company) {
  const result = await database.query(
    `INSERT INTO departments (name, default_check_in, default_check_out, notes, company)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [data.name, data.default_check_in_time, data.default_check_out_time, data.notes || null, company]
  );
  return result.rows[0];
}

async function update(database, id, data, company) {
  const fields = [];
  const values = [];
  for (const [column, value] of Object.entries(data)) { values.push(value); fields.push(`${column} = $${values.length}`); }
  values.push(id, company);
  const result = await database.query(
    `UPDATE departments SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${values.length - 1} AND company = $${values.length} RETURNING *`, values
  );
  return result.rows[0] || null;
}

async function employeeCount(database, id, company) {
  const result = await database.query("SELECT COUNT(*)::int AS count FROM employees WHERE department_id = $1 AND company = $2", [id, company]);
  return result.rows[0].count;
}

async function remove(database, id, company) {
  const result = await database.query("DELETE FROM departments WHERE id = $1 AND company = $2 RETURNING id", [id, company]);
  return result.rows[0] || null;
}

async function transfer(database, employeeIds, departmentId, company) {
  const result = await database.query(
    `UPDATE employees SET department_id = $1, updated_at = NOW()
     WHERE id = ANY($2::uuid[]) AND company = $3
       AND (SELECT COUNT(*) FROM employees WHERE id = ANY($2::uuid[]) AND company = $3) = cardinality($2::uuid[])
       AND EXISTS (SELECT 1 FROM departments WHERE id = $1 AND company = $3)`,
    [departmentId, employeeIds, company]
  );
  return result.rowCount;
}

async function attendance(database, departmentId, date, company) {
  const result = await database.query(
    `SELECT e.id AS employee_id, e.employee_id, u.email, ar.attendance_date, ar.status,
            ar.check_in_time, ar.check_out_time, ar.delay_minutes
    FROM employees e JOIN users u ON u.id = e.user_id
    JOIN departments d ON d.id = e.department_id
     LEFT JOIN attendance_records ar ON ar.employee_id = e.id AND ar.attendance_date = $2
    WHERE e.department_id = $1 AND e.company = $3 AND d.company = $3 ORDER BY e.employee_id`, [departmentId, date, company]
  );
  return result.rows;
}

module.exports = { list, findById, create, update, employeeCount, remove, transfer, attendance };
