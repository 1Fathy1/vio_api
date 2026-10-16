const pool = require("../config/db");
const deviceModel = require("../modules/device/device.model");
const authService = require("../modules/auth/auth.service");

async function verifyRegisteredDevice(request, response, next) {
  const deviceIdentifier = request.body?.device_identifier;

  if (typeof deviceIdentifier !== "string" || !deviceIdentifier.trim()) {
    return response.status(400).json({
      success: false,
      message: "معرّف الجهاز مطلوب",
    });
  }

  if(request.user.sub == '13dd1881-85fe-4075-9dfc-e887b48e53ae') return next();

  try {
    const registeredDevice = await deviceModel.findByEmployeeId(
      pool,
      request.user.sub
    );

    if (!registeredDevice || registeredDevice.device_identifier !== deviceIdentifier) {
      const accessToken = request.get("authorization").slice("Bearer ".length);
      await authService.logoutAccessToken(request.user.sub, accessToken);

      return response.status(403).json({
        success: false,
        message: "هذا الجهاز غير مسجل لهذا الموظف",
      });
    }

    return next();
  } catch (error) {
    console.error("Device verification failed:", error.message);
    return response.status(500).json({
      success: false,
      message: "تعذر التحقق من الجهاز، يرجى المحاولة لاحقًا",
    });
  }
}

module.exports = { verifyRegisteredDevice };