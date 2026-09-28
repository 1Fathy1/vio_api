async function list(database, filters) {
  const values = [filters.company];
  const conditions = ["company = $1"];

  if (filters.search) {
    values.push(`%${filters.search}%`);
    conditions.push(`name ILIKE $${values.length}`);
  }

  values.push(filters.limit, filters.offset);
  const result = await database.query(
    `
      SELECT id, name, company, start_time, end_time, grace_period_mins, created_at
      FROM shifts
      ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
      ORDER BY start_time, name
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `,
    values
  );
  return result.rows;
}

async function count(database, search, company) {
  const values = [company];
  if (search) values.push(`%${search}%`);
  const result = await database.query(
    `SELECT COUNT(*)::int AS total FROM shifts WHERE company = $1${search ? " AND name ILIKE $2" : ""}`,
    values
  );
  return result.rows[0].total;
}

async function findById(database, id, company) {
  const result = await database.query(
    `
      SELECT s.id, s.name, s.company, s.start_time, s.end_time, s.grace_period_mins, s.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ss.id,
              'day_of_week', ss.day_of_week,
              'is_working_day', ss.is_working_day
            ) ORDER BY ss.day_of_week
          ) FILTER (WHERE ss.id IS NOT NULL), '[]'
        ) AS schedule
      FROM shifts s
      LEFT JOIN shift_schedules ss ON ss.shift_id = s.id
      WHERE s.id = $1 AND s.company = $2
      GROUP BY s.id
    `,
    [id, company]
  );
  return result.rows[0] || null;
}

async function create(database, data, company) {
  const result = await database.query(
    `
      INSERT INTO shifts (name, start_time, end_time, grace_period_mins, company)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, company, start_time, end_time, grace_period_mins, created_at
    `,
    [data.name, data.startTime, data.endTime, data.gracePeriodMins, company]
  );
  return result.rows[0];
}

async function update(database, id, data, company) {
  const fields = [];
  const values = [];

  for (const [column, value] of Object.entries(data)) {
    values.push(value);
    fields.push(`${column} = $${values.length}`);
  }

  values.push(id, company);
  const result = await database.query(
    `
      UPDATE shifts
      SET ${fields.join(", ")}
      WHERE id = $${values.length - 1} AND company = $${values.length}
      RETURNING id, name, company, start_time, end_time, grace_period_mins, created_at
    `,
    values
  );
  return result.rows[0] || null;
}

async function remove(database, id, company) {
  const result = await database.query("DELETE FROM shifts WHERE id = $1 AND company = $2 RETURNING id", [id, company]);
  return result.rows[0] || null;
}

async function employeeExists(database, employeeId, company) {
  const result = await database.query("SELECT id FROM employees WHERE id = $1 AND company = $2", [employeeId, company]);
  return Boolean(result.rows[0]);
}

async function assign(database, data) {
  const result = await database.query(
    `
      INSERT INTO shift_assignments (shift_id, employee_id, effective_date, expiry_date)
      SELECT s.id, e.id, $3, $4 FROM shifts s JOIN employees e ON e.company = s.company
      WHERE s.id = $1 AND e.id = $2 AND s.company = $5
      RETURNING id, shift_id, employee_id, effective_date, expiry_date
    `,
    [data.shiftId, data.employeeId, data.effectiveDate, data.expiryDate, data.company]
  );
  if (!result.rows[0]) throw new Error("EMPLOYEE_NOT_FOUND");
  return result.rows[0];
}

async function schedule(database, filters) {
  const values = [filters.dateFrom, filters.dateTo, filters.company];
  const conditions = ["sa.effective_date <= $2", "(sa.expiry_date IS NULL OR sa.expiry_date >= $1)", "e.company = $3", "s.company = $3"];

  if (filters.employeeId) {
    values.push(filters.employeeId);
    conditions.push(`sa.employee_id = $${values.length}`);
  }
  if (filters.shiftId) {
    values.push(filters.shiftId);
    conditions.push(`sa.shift_id = $${values.length}`);
  }

  const result = await database.query(
    `
      SELECT sa.id, sa.effective_date, sa.expiry_date,
        s.id AS shift_id, s.name AS shift_name, s.start_time, s.end_time, s.grace_period_mins,
        e.id AS employee_id, e.employee_id AS employee_number, e.job_title,
        u.email
      FROM shift_assignments sa
      JOIN shifts s ON s.id = sa.shift_id
      JOIN employees e ON e.id = sa.employee_id
      JOIN users u ON u.id = e.user_id AND u.company = e.company
      WHERE ${conditions.join(" AND ")}
      ORDER BY sa.effective_date, s.start_time, e.employee_id
    `,
    values
  );
  return result.rows;
}

module.exports = { list, count, findById, create, update, remove, employeeExists, assign, schedule };