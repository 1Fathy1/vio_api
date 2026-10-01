async function findEmployeeByUser(database, userId) {
  const result = await database.query("select * from employees where id = $1", [userId]);
  return result.rows[0] || null;
}


async function upsertCheckIn(database, data) {
  const existing = await database.query(
    `SELECT id, attendance_date
     FROM attendance_records
     WHERE employee_id = $1
     AND attendance_date = CURRENT_DATE
     AND status = 'حضور'`,
    [data.employee_id]
  );

  if (existing.rows[0]) {
    throw new Error("YOU_MUST_LEAVE_FIRST");
  }

  const result = await database.query(
    `INSERT INTO attendance_records
     (
       employee_id,
       attendance_date,
       check_in_time,
       status,
       delay_minutes,
       company
     )
     VALUES
     (
       $1,
       CURRENT_DATE,
       $2,
       $3,
       $4,
       $5
     )
     RETURNING *`,
    [
      data.employee_id,
      data.check_in_time,
      data.status,
      data.delay_minutes,
      data.company
    ]
  );

  return result.rows[0];
}

async function updateCheckOut(database, checkId, egyptTime) {
  const result = await database.query(
    `UPDATE attendance_records SET check_out_time = $1, status = 'انصراف'
     WHERE id = $2 `, [egyptTime, checkId]
  );
  return result.rows || null;
}

async function check(database, checkId) {
  const result = await database.query(
    `select * from attendance_records 
     WHERE id = $1 `, [checkId]
  );
  return result.rows[0] || null;
}

async function history(database, company) {
  const result = await database.query(
    `SELECT
    e.name,
    e.id,
    ar.attendance_date,
    ar.check_in_time,
    ar.check_out_time,
    ar.status,
    ar.delay_minutes,
    ar.deduction_days
FROM attendance_records ar
JOIN employees e
    ON e.id = ar.employee_id
WHERE ar.company = $1
ORDER BY ar.attendance_date DESC;`, [company]
  );
  return result.rows;
}

async function findRecord(database, id, company) {
  const result = await database.query(
    `SELECT ar.*, e.employee_id, u.email, d.name AS department
     FROM attendance_records ar JOIN employees e ON e.id = ar.employee_id
    JOIN users u ON u.id = e.user_id JOIN departments d ON d.id = e.department_id
    WHERE ar.id = $1 AND e.company = $2 AND u.company = $2 AND d.company = $2`, [id, company]
  );
  return result.rows[0] || null;
}

async function listByEmployee(database, data) {
  const result = await database.query(
    `select check_in_time, check_out_time, delay_minutes, attendance_date
       from attendance_records where employee_id = $1 order by attendance_date desc`, [data]);
  return result.rows || null;
}

async function listDaleyByEmployee(database, id) {
  const result = await database.query(
    `select check_in_time, check_out_time, status, attendance_date, delay_minutes
from attendance_records where employee_id = $1 AND delay_minutes > 0 ; `, [id]);
  return result.rows || null;
}

async function location(database, id) {
  const result = await database.query(
    `select * From locations where company_id = $1 ; `, [id]);
  return result.rows[0] || null;
}

// async function createAdjustment(database, data) {
//   await database.query(
//     `INSERT INTO attendance_adjustments (attendance_record_id, adjusted_by, reason, old_status, new_status)
//      VALUES ($1, $2, $3, $4, $5)`, [data.recordId, data.adjustedBy, data.reason, data.oldStatus, data.newStatus]
//   );
// }

// async function requests(database, filters, company) {
//   const result = await database.query(
//     `SELECT arq.*, e.employee_id, u.email FROM attendance_requests arq
//      JOIN employees e ON e.id = arq.employee_id JOIN users u ON u.id = e.user_id
//      WHERE e.company = $2 AND u.company = $2
//        AND ($1::text IS NULL OR arq.status = $1) ORDER BY arq.created_at DESC`, [filters.status || null, company]
//   );
//   return result.rows;
// }

// async function createRequest(database, data) {
//   const result = await database.query(
//     `INSERT INTO attendance_requests (employee_id, request_date, requested_check_in, requested_check_out, reason)
//      VALUES ($1, $2, $3, $4, $5) RETURNING *`, [data.employeeId, data.date, data.checkIn, data.checkOut, data.reason]
//   );
//   return result.rows[0];
// }

// async function updateRequest(database, id, status, reviewedBy, company) {
//   const result = await database.query(
//     `UPDATE attendance_requests ar SET status = $2, reviewed_by = $3 FROM employees e
//      JOIN users u ON u.id = e.user_id
//      WHERE ar.employee_id = e.id AND ar.id = $1 AND e.company = $4 AND u.company = $4 RETURNING ar.*`, [id, status, reviewedBy, company]
//   );
//   return result.rows[0] || null;
// }

// async function today(database, company, status) {
//   const result = await database.query(
//     `SELECT ar.*, e.employee_id, u.email, d.name AS department
//      FROM attendance_records ar JOIN employees e ON e.id = ar.employee_id
//      JOIN users u ON u.id = e.user_id JOIN departments d ON d.id = e.department_id
//      WHERE ar.attendance_date = CURRENT_DATE AND e.company = $1 AND u.company = $1 AND d.company = $1
//        AND ($2::text IS NULL OR ar.status = $2)
//      ORDER BY ar.check_in_time`, [company, status || null]
//   );
//   return result.rows;
// }

module.exports = {check, location, findEmployeeByUser, upsertCheckIn, updateCheckOut, history, findRecord, listByEmployee, listDaleyByEmployee };
