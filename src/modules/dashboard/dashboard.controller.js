const attendanceModel = require("./models/attendance.model");
const activityLogModel = require("./models/activity-log.model");
const pool = require("../../config/db");

async function getStats(request, response) {
  try {
    const data = await attendanceModel.getStats(pool, request.user.company);
    return response.json({ success: true, data });
  } catch (error) {
    console.error("Dashboard stats query failed:", error.message);
    return response.status(500).json({
      success: false,
      message: "تعذر تحميل إحصائيات لوحة التحكم",
    });
  }
}

async function getCharts(request, response) {
  const range = request.query.range || "weekly";

  if (!attendanceModel.CHART_RANGES[range]) {
    return response.status(400).json({
      success: false,
      message: "يجب أن تكون الفترة أسبوعية أو شهرية",
    });
  }

  try {
    const data = await attendanceModel.getCharts(pool, range, request.user.company);
    return response.json({ success: true, data });
  } catch (error) {
    console.error("Dashboard charts query failed:", error.message);
    return response.status(500).json({
      success: false,
      message: "تعذر تحميل رسوم لوحة التحكم",
    });
  }
}

async function getActivities(request, response) {
  const requestedLimit = Number.parseInt(request.query.limit, 10);
  const limit = Number.isInteger(requestedLimit) ? requestedLimit : 10;

  if (limit < 1 || limit > 100) {
    return response.status(400).json({
      success: false,
      message: "يجب أن يكون عدد النتائج بين 1 و100",
    });
  }

  try {
    const data = await activityLogModel.findLatest(pool, limit, request.user.company);
    return response.json({ success: true, data });
  } catch (error) {
    console.error("Dashboard activities query failed:", error.message);
    return response.status(500).json({
      success: false,
      message: "تعذر تحميل أنشطة لوحة التحكم",
    });
  }
}

async function getTodaysAttendance(request, response) {
  const status = typeof request.query.status === "string" ? request.query.status : null;

  try {
    const data = await attendanceModel.getTodaysAttendance(pool, status, request.user.company);
    return response.json({ success: true, data });
  } catch (error) {
    console.error("Today's attendance query failed:", error.message);
    return response.status(500).json({
      success: false,
      message: "تعذر تحميل سجلات حضور اليوم",
    });
  }
}

module.exports = { getStats, getCharts, getActivities, getTodaysAttendance };
