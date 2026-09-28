const authService = require("../modules/auth/auth.service");

function requireAuth(request, response, next) {
  const authorization = request.get("authorization");

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return response.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  try {
    request.user = authService.verifyToken(authorization.slice("Bearer ".length), "access");
    return next();
  } catch (_error) {
    return response.status(401).json({
      success: false,
      message: "Invalid or expired access token",
    });
  }
}

module.exports = { requireAuth };