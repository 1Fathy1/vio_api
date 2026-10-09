const authService = require("../modules/auth/auth.service");

function requireAuth(request, response, next) {
  const authorization = request.get("authorization");

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return response.status(401).json({
      success: false,
      message: "يجب تسجيل الدخول أولًا",
    });
  }

  try {
    request.user = authService.verifyToken(authorization.slice("Bearer ".length), "access");
    return next();
  } catch (_error) {
    return response.status(401).json({
      success: false,
      message: "انتهت صلاحية تسجيل الدخول أو أن رمز الدخول غير صالح",
    });
  }
}

module.exports = { requireAuth };