const attendanceService = require("../modules/attendance/attendance.service");

const invalidLocationErrors = new Set([
  "اخدثيات الموقع مفقوده برجاء تفعيل تحدد المواقع",
  "قيم الاحدثيات غير صحيحه",
]);

async function verifyLocation(request, response, next) {
  try {
    const location = await attendanceService.location(request);

    if (!location.isInside) {
      return response.status(403).json({
        success: false,
        message: "Check-in is only allowed within the company's location",
      });
    }

    return next();
  } catch (error) {
    if (invalidLocationErrors.has(error.message)) {
      return response.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Location verification failed:", error.message);
    return response.status(500).json({
      success: false,
      message: "Location verification failed",
    });
  }
}

module.exports = { verifyLocation };