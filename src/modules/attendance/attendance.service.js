const pool = require("../../config/db");
const model = require("./attendance.model");
const transaction = require("../auth/models/transaction.model");

async function employee(userId) {
  const result = await model.findEmployeeByUser(pool, userId);
  if (!result) throw new Error("EMPLOYEE_NOT_FOUND");
  return result;
}

function getDelayMinutes(startTime, currentTime) {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [currentHour, currentMinute] = currentTime.split(":").map(Number);

  const startTotalMinutes = startHour * 60 + startMinute;
  const currentTotalMinutes = currentHour * 60 + currentMinute;

  return Math.max(0, currentTotalMinutes - startTotalMinutes);
}

async function checkIn(request) {
  const client = await pool.connect();

  try {
    await transaction.begin(client);

    const egyptTime = new Date().toLocaleTimeString("en-GB", {
      timeZone: "Africa/Cairo",
      hour12: false,
    });

    console.log(request.user)
    const delay_minutes = getDelayMinutes(
      request.user.startTime,
      egyptTime
    );

    const input = {
      employee_id: request.user.sub,
      check_in_time: egyptTime,
      status: "حضور",
      delay_minutes,
      check_out_time: null,
      company: request.user.company,
    };

    const record = await model.upsertCheckIn(client, input);

    await transaction.commit(client);

    return record;
  } catch (error) {
    await transaction.rollback(client);
    return error.message;
  } finally {
    client.release();
  }
}

async function checkOut(userId, company, input) {
  const currentEmployee = await employee(userId, company);
  const client = await pool.connect();
  try {
    await transaction.begin(client);
    const log = await model.createLog(client, { employeeId: currentEmployee.id, type: "OUT", ...input });
    const record = await model.updateCheckOut(client, { employeeId: currentEmployee.id });
    if (!record) throw new Error("CHECK_IN_REQUIRED");
    await transaction.commit(client);
    return { log, record };
  } catch (error) { await transaction.rollback(client); throw error; }
  finally { client.release(); }
}

async function history(company) {
  return model.history(pool, company);
}


async function details(id, company) {
  const result = await model.findRecord(pool, id, company);
  if (!result)
    throw new Error("ATTENDANCE_NOT_FOUND");
  return result;
}

async function listDaleyByEmployee(id) {
  const result = await model.listDaleyByEmployee(pool, id);
  if (!result)
    throw new Error("ATTENDANCE_NOT_FOUND");
  return result;
}

// async function adjust(userId, company, input) {
//   const result = await model.adjust(pool, input, company);
//   if (!result) throw new Error("ATTENDANCE_NOT_FOUND");
//   await model.createAdjustment(pool, { recordId: input.id, adjustedBy: userId, reason: input.reason, oldStatus: input.old_status, newStatus: input.status });
//   return result;
// }

async function listByEmployee(employee_id) {
  const result = await model.listByEmployee(pool, employee_id);

  if (!result || result.length === 0) {
    throw new Error("ATTENDANCE_NOT_FOUND");
  }

  return result.map((item) => {
    let workTimeByH = 0;
    let workTimeByM = 0;

    if (item.check_in_time && item.check_out_time) {
      const [inH, inM, inS] = item.check_in_time.split(":").map(Number);
      const [outH, outM, outS] = item.check_out_time.split(":").map(Number);

      const checkIn = new Date();
      checkIn.setHours(inH, inM, inS, 0);

      const checkOut = new Date();
      checkOut.setHours(outH, outM, outS, 0);

      const totalMinutes = Math.floor(
        (checkOut - checkIn) / (1000 * 60)
      );

      workTimeByH = Math.floor(totalMinutes / 60);
      workTimeByM = totalMinutes % 60;
    }

    return {
      attendanceDate: item.attendance_date,
      checkInTime: item.check_in_time,
      checkOutTime: item.check_out_time,
      delayMinutes: item.delay_minutes,
      status: item.delay_minutes > 0 ? "متأخر" : "ملتزم",
      workTimeByH,
      workTimeByM,
    };
  });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // نصف قطر الأرض بالمتر

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

async function location(company_id) {
  const result = await model.location(pool, company_id);

  // لينك اللوكيشن المخزن للكافيه أو الشركة
  const url =
    "https://www.google.com/maps?q=31.057371139526367,31.404672622680664&z=17&hl=en";

  // المدى المسموح بالمتر
  const radius = 100;

  // استخراج إحداثيات الكافيه من اللينك
  const params = new URL(url).searchParams;
  const [cafeLatitude, cafeLongitude] = params
    .get("q")
    .split(",")
    .map(Number);

  // إحداثيات الموظف الحالية (استاتيك مؤقتا)
  const employeeLatitude = 31.057500;
  const employeeLongitude = 31.404800;

  // حساب المسافة بين الموظف والكافيه
  const distance = calculateDistance(
    employeeLatitude,
    employeeLongitude,
    cafeLatitude,
    cafeLongitude
  );

  // هل الموظف داخل النطاق؟
  const isInside = distance <= radius;

  return {
    cafeLocation: {
      latitude: cafeLatitude,
      longitude: cafeLongitude,
    },
    employeeLocation: {
      latitude: employeeLatitude,
      longitude: employeeLongitude,
    },
    distance, // المسافة الفعلية بالمتر
    radius, // المدى المسموح
    isInside, // true لو داخل النطاق
  };
}




// async function requests(userId, company, input) {
//   if (input.action === "create") {
//     const currentEmployee = await employee(userId, company);
//     return model.createRequest(pool, { employeeId: currentEmployee.id, date: input.request_date, checkIn: input.requested_check_in, checkOut: input.requested_check_out, reason: input.reason });
//   }
//   if (input.action === "update") {
//     const result = await model.updateRequest(pool, input.id, input.status, userId, company);
//     if (!result) throw new Error("REQUEST_NOT_FOUND");
//     return result;
//   }
//   return model.requests(pool, input, company);
// }

// async function today(company, status) { return model.today(pool, company, status); }
// async function listByStatus(company, status) { return model.today(pool, company, status); }

module.exports = { location, checkIn, checkOut, history, details, listByEmployee, listDaleyByEmployee };
