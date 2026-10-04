const APP_SETTINGS_TABLE = "app_settings";
const ATTENDANCE_SETTINGS_TABLE = "attendance_settings";

// async function list(pool, table, keyColumn, valueColumn) {
//   const result = await pool.query(
//     `SELECT ${keyColumn} AS key, ${valueColumn} AS value, updated_at
//      FROM ${table}
//      ORDER BY ${keyColumn}`,
//   );
//   return result.rows;
// }

async function location(database, id) {
  const result = await database.query(
    `
   SELECT
    c.id,
    c.place_name,
    c.place_location,

    l.id,
    l.location_url,
    l.radius_meters
FROM company c
LEFT JOIN locations l
    ON l.company_id = c.id
WHERE c.id = $1;
   `,
    [id]
  );
  return result.rows[0] || null;
}

async function updateLocation(database, companyId, data) {
  console.log("Location Information", data);
  console.log("Company Information", data.info);
console.log(Object.keys(data.info).length);

  const client = await database.connect();

  try {
    await client.query("BEGIN");

    const locationResult = await client.query(
      `UPDATE locations
       SET latitude = $1,
           longitude = $2,
           radius_meters = $3,
           location_url = $4
       WHERE company_id = $5
       RETURNING company_id, location_url, latitude, longitude, radius_meters`,
      [
        data.latitude,
        data.longitude,
        data.info.radius_meters,
        data.locationUrl,
        companyId,
      ]
    );

    let companyResult = null;

    if (Number(data.info?.full_mode) === 1 && Object.keys(data.info).length >= 4) {
      companyResult = await client.query(
        `UPDATE company
         SET place_name = $1,
             place_location = $2
         WHERE id = $3
         RETURNING id, place_name, place_location`,
        [
          data.info.place_name,
          data.info.place_location,
          companyId,
        ]
      );
    }

    await client.query("COMMIT");

    return {
      location: locationResult.rows[0],
      company: companyResult?.rows[0] || null,
    };
  } catch (e) {
    await client.query("ROLLBACK");
    throw new Error("DATA_BASE_EXCEPTION: " + e.message);
  } finally {
    client.release();
  }
}

async function attendanceRules(database, id) {
  const result = await database.query(
    "SELECT setting_key,setting_value FROM attendance_settings WHERE company_id = $1 ",
    [id]
  );
  return result.rows || null;
}

async function reportDetails(database, companyId, startDate, endDate) {
  const result = await database.query(
    `SELECT
       e.name,
       COALESCE(SUM(ar.delay_minutes), 0) AS total_delay,
       COALESCE(SUM(ar.deduction_days), 0) AS total_deduction
     FROM employees e
     LEFT JOIN attendance_records ar
       ON ar.employee_id = e.id
       AND ($2::date IS NULL OR ar.attendance_date >= $2::date)
       AND ($3::date IS NULL OR ar.attendance_date <= $3::date)
     WHERE e.company = $1
     GROUP BY e.id, e.name
     ORDER BY e.name`,
    [companyId, startDate, endDate]
  );
  return result.rows;
}

async function reportOverview(database, companyId, startDate, endDate) {
  const result = await database.query(
    `SELECT
       COUNT(DISTINCT employee_id) AS employees,
       COALESCE(SUM(deduction_days), 0) AS total_deduction_day,
       COALESCE(SUM(delay_minutes), 0) AS total_delay_min
     FROM attendance_records
     WHERE company = $1
       AND delay_minutes > 0
       AND ($2::date IS NULL OR attendance_date >= $2::date)
       AND ($3::date IS NULL OR attendance_date <= $3::date)`,
    [companyId, startDate, endDate]
  );
  return result.rows[0];
}

async function updateAttendanceSettings(database, companyId, settings) {
  const client = await database.connect();

  try {
    await client.query("BEGIN");

    const updatedRows = [];

    for (const [settingKey, settingValue] of Object.entries(settings)) {
      const result = await client.query(
        `UPDATE attendance_settings
         SET setting_value = $1,
             updated_at = NOW()
         WHERE company_id = $2
           AND setting_key = $3
         RETURNING id, setting_key, setting_value, company_id`,
        [settingValue, companyId, settingKey]
      );

      if (result.rows.length) {
        updatedRows.push(result.rows[0]);
      }
    }

    await client.query("COMMIT");

    return updatedRows;
  } catch (e) {
    await client.query("ROLLBACK");
    throw new Error("DATA_BASE_EXCEPTION: " + e.message);
  } finally {
    client.release();
  }
}

async function hrProfile(database, id) {
  const result = await database.query(
    "SELECT id, email, phone_number, name FROM users WHERE id = $1",
    [id]
  );
  return result.rows[0] || null;
}

async function hrProfileUpdate(database, id, data) {
  const result = await database.query(
    `
    UPDATE users
    SET
      email = $2,
      phone_number = $3,
      name = $4,
      updated_at = NOW()
    WHERE id = $1
    RETURNING id, email, phone_number, name
    `,
    [
      id,
      data.email,
      data.phone_number,
      data.name,
    ]
  );

  return result.rows[0] || null;
}


// async function upsert(pool, table, keyColumn, valueColumn, settings) {
//   const client = await pool.connect();

//   try {
//     await client.query("BEGIN");

//     for (const [key, value] of Object.entries(settings)) {
//       await client.query(
//         `INSERT INTO ${table} (${keyColumn}, ${valueColumn})
//          VALUES ($1, $2)
//          ON CONFLICT (${keyColumn})
//          DO UPDATE SET ${valueColumn} = EXCLUDED.${valueColumn}, updated_at = NOW()`,
//         [key, String(value)],
//       );
//     }

//     await client.query("COMMIT");
//     const rows = await list(client, table, keyColumn, valueColumn);
//     return rows;
//   } catch (error) {
//     await client.query("ROLLBACK");
//     throw error;
//   } finally {
//     client.release();
//   }
// }

module.exports = {
  location,
  updateLocation,
  hrProfile,
  hrProfileUpdate,
  attendanceRules,
  reportDetails,
  reportOverview,
  updateAttendanceSettings
};