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
  const result = await database.query(`select count(*) from attendance_records where company = $1 AND attendance_date = current_date ;`, [company]);

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
     select count(*) from attendance_records where company = $1 AND attendance_date = current_date
    `,
    [company]
  );

  return result.rows;
}

module.exports = { TIMEFRAMES, CHART_RANGES, getStats, getCharts, getTodaysAttendance };
