const authService = require("../modules/auth/auth.service");

async function requireAuth(request, response, next) {
  const authorization = request.get("authorization");

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return response.status(401).json({
      success: false,
      message: "يجب تسجيل الدخول أولًا",
    });
  }

  const accessToken = authorization.slice("Bearer ".length);

  try {
    request.user = authService.verifyToken(accessToken, "access");
  } catch (_error) {
    return response.status(401).json({
      success: false,
      message: "انتهت صلاحية تسجيل الدخول أو أن رمز الدخول غير صالح",
    });
  }

  try {
    const isActive = await authService.isAccessTokenActive(
      request.user.sub,
      accessToken
    );

    if (!isActive) {
      return response.status(401).json({
        success: false,
        message: "انتهت صلاحية تسجيل الدخول أو أن رمز الدخول غير صالح",
      });
    }

    return next();
  } catch (error) {
    console.error("Access token session verification failed:", error.message);
    return response.status(500).json({
      success: false,
      message: "تعذر التحقق من تسجيل الدخول، يرجى المحاولة لاحقًا",
    });
  }
}

module.exports = { requireAuth };