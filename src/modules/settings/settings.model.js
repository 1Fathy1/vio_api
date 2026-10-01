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
    "SELECT * FROM public.company WHERE id = $1 ",
    [id]
  );
  return result.rows[0] || null;
}

async function attendanceRules(database, id) {
  const result = await database.query(
    "SELECT setting_key,setting_value FROM attendance_settings WHERE company_id = $1 ",
    [id]
  );
  return result.rows || null;
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
  hrProfile,
  hrProfileUpdate,
  attendanceRules
};