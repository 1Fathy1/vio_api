const authService = require("./auth.service");

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sendAuthError(response, error) {
  const errors = {
    ACCOUNT_ALREADY_EXISTS: [409, "Email or phone number is already registered"],
    COMPANY_NOT_ASSIGNED: [403, "The account is not assigned to a company"],
    INVALID_CREDENTIALS: [401, "Invalid credentials"],
    INVALID_OLD_PASSWORD: [401, "Current password is incorrect"],
    ACCOUNT_INACTIVE: [403, "Account is inactive"],
    INVALID_REFRESH_TOKEN: [401, "Invalid or expired refresh token"],
    USER_NOT_FOUND: [404, "User not found"],
    INVALID_RESET_TOKEN: [400, "Invalid or expired reset token"],
    INVALID_OTP: [400, "Invalid or expired OTP"],
  };
  const [status, message] = errors[error.message] || [500, "Authentication request failed"];

  if (status === 500) {
    console.error("Authentication error:", error.stack || error);
  }

  const details = process.env.NODE_ENV === "production" ? undefined : error.stack || error.message;
  return response.status(status).json({ success: false, message, ...(details && { details }) });
}

async function register(request, response) {
  const { name, email, phone_number: phoneNumber, password, company } = request.body || {};

  if (typeof name !== "string" || name.trim().length === 0) {
    return response.status(400).json({ success: false, message: "name is required" });
  }

  if (!isValidEmail(email)) {
    return response.status(400).json({ success: false, message: "A valid email is required" });
  }

  if (typeof phoneNumber !== "string" || phoneNumber.trim().length === 0) {
    return response.status(400).json({ success: false, message: "phone_number is required" });
  }

  if (typeof password !== "string" || password.length < 8) {
    return response.status(400).json({
      success: false,
      message: "password must be at least 8 characters",
    });
  }

  const validCompany =
    (typeof company === "number" && Number.isSafeInteger(company) && company > 0) ||
    (typeof company === "string" && /^[1-9]\d*$/.test(company));

  if (!validCompany) {
    return response.status(400).json({ success: false, message: "a positive company id is required" });
  }

  try {
    const data = await authService.register({
      name: name.trim(),
      email,
      phone_number: phoneNumber,
      password,
      company: company ?? null,
    });

    return response.status(201).json({ success: true, data });
  } catch (error) {
    return sendAuthError(response, error);
  }
}

async function login(request, response) {
  const { email, password } = request.body || {};

  if (!isValidEmail(email) || typeof password !== "string" || password.length < 8) {
    return response.status(400).json({
      success: false,
      message: "A valid email and password of at least 8 characters are required",
    });
  }

  try {
    const data = await authService.login({ email, password });
    return response.json({ success: true, data });
  } catch (error) {
    return sendAuthError(response, error);
  }
}

async function logout(request, response) {
  const { refresh_token: refreshToken } = request.body || {};
  const accessToken = request.get("authorization").slice("Bearer ".length);

  if (typeof refreshToken !== "string" || refreshToken.length === 0) {
    return response.status(400).json({ success: false, message: "refresh_token is required" });
  }

  try {
    await authService.logout(request.user.sub, accessToken, refreshToken);
    return response.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    return sendAuthError(response, error);
  }
}

async function login_employee(request, response) {
  const { username, password } = request.body || {};

  if (!username || !password) {
    return response.status(400).json({success: false, message: "all filed are required"})
  }

  try {
    // console.log(username, password)
    
    const data = await authService.loginEmployee({ username, password });
    return response.json({ success: true, data });
  } catch (error) {
    return sendAuthError(response, error);
  }
}

async function refreshToken(request, response) {
  const { refresh_token: token } = request.body || {};

  if (typeof token !== "string" || token.length === 0) {
    return response.status(400).json({ success: false, message: "refresh_token is required" });
  }

  try {
    const data = await authService.refreshAccessToken(token);
    return response.json({ success: true, data });
  } catch (error) {
    return sendAuthError(response, error);
  }
}

async function resetPassword(request, response) {
  const {
    oldPassword,
    new_password: newPassword,
    confirmPassword,
  } = request.body || {};

  if (!oldPassword || !newPassword || !confirmPassword) {
    return response.status(400).json({
      success: false,
      message: "all filed are required",
    });
  }

  if (newPassword !== confirmPassword) {
    return response.status(400).json({
      success: false,
      message: "Password confirmation does not match",
    });
  }
  if (newPassword.length < 8) {
    return response.status(400).json({
      success: false,
      message: "new_password must be at least 8 characters",
    });
  }

  try {
    await authService.resetPassword(request.user.sub, newPassword, oldPassword);
    return response.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    return sendAuthError(response, error);
  }
}

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  resetPassword,
  login_employee
};
