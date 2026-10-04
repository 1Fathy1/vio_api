const TIMEFRAMES = {
  today: "CURRENT_DATE",
  this_week: "DATE_TRUNC('week', CURRENT_DATE)::date",
  this_month: "DATE_TRUNC('month', CURRENT_DATE)::date",
};

const CHART_RANGES = {
  weekly: 7,
  monthly: 30,
};

async function getStats(database, company) {
  const result = await database.query(`select count(*) from attendance_records where status = 'حضور' AND company = $1 AND attendance_date = current_date ;`, [company]);

  return result.rows[0];
}

async function getCharts(database, range, company) {
  const result = await database.query(
    `
      SELECT
        ar.attendance_date AS date,
        COUNT(*) FILTER (WHERE LOWER(ar.status) IN ('present', 'on_time'))::int AS present,
        COUNT(*) FILTER (WHERE LOWER(ar.status) = 'late')::int AS late,
        COUNT(*) FILTER (WHERE LOWER(ar.status) = 'absent')::int AS absent
      FROM attendance_records ar JOIN employees e ON e.id = ar.employee_id
      WHERE ar.attendance_date >= CURRENT_DATE - $1::int + 1
        AND ar.attendance_date <= CURRENT_DATE
        AND e.company = $2
      GROUP BY ar.attendance_date
      ORDER BY ar.attendance_date ASC
    `,
    [CHART_RANGES[range], company]
  );

  return result.rows;
}

async function getTodaysAttendance(database, status, company) {
  const result = await database.query(
    `
      SELECT
        e.id AS employee_id,
        e.employee_id AS employee_number,
        u.email,
        d.name AS department,
        COALESCE(ar.status, 'absent') AS status,
        ar.check_in_time,
        ar.check_out_time,
        ar.delay_minutes
      FROM employees e
      JOIN users u ON u.id = e.user_id
      JOIN departments d ON d.id = e.department_id
      LEFT JOIN attendance_records ar
        ON ar.employee_id = e.id
        AND ar.attendance_date = CURRENT_DATE
      WHERE LOWER(e.status) = 'active'
        AND e.company = $1 AND u.company = $1 AND d.company = $1
        AND ($2::text IS NULL OR LOWER(COALESCE(ar.status, 'absent')) = LOWER($2))
      ORDER BY e.employee_id ASC
    `,
    [company, status]
  );

  return result.rows;
}

module.exports = { TIMEFRAMES, CHART_RANGES, getStats, getCharts, getTodaysAttendance };
