const attendanceService = require("../modules/attendance/attendance.service");

const invalidLocationErrors = new Map([
  ["اخدثيات الموقع مفقوده برجاء تفعيل تحدد المواقع", "إحداثيات الموقع مفقودة، يرجى تفعيل خدمات الموقع"],
  ["قيم الاحدثيات غير صحيحه", "إحداثيات الموقع غير صحيحة"],
]);

async function verifyLocation(request, response, next) {
  try {
    const location = await attendanceService.location(request);

    if (!location.isInside) {
      return response.status(403).json({
        success: false,
        message: "لا يمكن تسجيل الحضور إلا من موقع الشركة",
      });
    }

    return next();
  } catch (error) {
    if (invalidLocationErrors.has(error.message)) {
      return response.status(400).json({
        success: false,
        message: invalidLocationErrors.get(error.message),
      });
    }

    console.error("Location verification failed:", error.message);
    return response.status(500).json({
      success: false,
      message: "تعذر التحقق من الموقع، يرجى المحاولة لاحقًا",
    });
  }
}

module.exports = { verifyLocation };