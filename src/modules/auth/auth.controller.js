const authService = require("./auth.service");

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sendAuthError(response, error) {
  const errors = {
    ACCOUNT_ALREADY_EXISTS: [409, "البريد الإلكتروني أو رقم الهاتف مسجل بالفعل"],
    COMPANY_NOT_ASSIGNED: [403, "هذا الحساب غير مرتبط بشركة"],
    INVALID_CREDENTIALS: [401, "بيانات تسجيل الدخول غير صحيحة"],
    INVALID_OLD_PASSWORD: [401, "كلمة المرور الحالية غير صحيحة"],
    ACCOUNT_INACTIVE: [403, "الحساب غير نشط"],
    INVALID_REFRESH_TOKEN: [401, "انتهت صلاحية رمز التحديث أو أنه غير صالح"],
    USER_NOT_FOUND: [404, "المستخدم غير موجود"],
    INVALID_RESET_TOKEN: [400, "انتهت صلاحية رمز إعادة تعيين كلمة المرور أو أنه غير صالح"],
    INVALID_OTP: [400, "انتهت صلاحية رمز التحقق أو أنه غير صالح"],
    DEVICE_NOT_APPROVED: [403, "لم يتم السماح بتسجيل الدخول من هذا الجهاز"],
    "اسم المستخدم او كلمه السر غير صحيحه": [401, "اسم المستخدم أو كلمة المرور غير صحيحة"],
    "هذا الحساب معلق مؤقتا, تواصل مع المدير": [403, "هذا الحساب موقوف مؤقتًا، يرجى التواصل مع المسؤول"],
    "تم تسجيل الحساب علي جهاز اخر": [403, "الحساب مسجل على جهاز آخر"],
  };
  const [status, message] = errors[error.message] || [500, "تعذر إتمام طلب المصادقة، يرجى المحاولة لاحقًا"];

  if (status === 500) {
    console.error("Authentication error:", error.stack || error);
  }

  return response.status(status).json({ success: false, message });
}

async function register(request, response) {
  const { name, email, phone_number: phoneNumber, password, company } = request.body || {};

  if (typeof name !== "string" || name.trim().length === 0) {
    return response.status(400).json({ success: false, message: "الاسم مطلوب" });
  }

  if (!isValidEmail(email)) {
    return response.status(400).json({ success: false, message: "يرجى إدخال بريد إلكتروني صحيح" });
  }

  if (typeof phoneNumber !== "string" || phoneNumber.trim().length === 0) {
    return response.status(400).json({ success: false, message: "رقم الهاتف مطلوب" });
  }

  if (typeof password !== "string" || password.length < 8) {
    return response.status(400).json({
      success: false,
      message: "يجب ألا تقل كلمة المرور عن 8 أحرف",
    });
  }

  const validCompany =
    (typeof company === "number" && Number.isSafeInteger(company) && company > 0) ||
    (typeof company === "string" && /^[1-9]\d*$/.test(company));

  if (!validCompany) {
    return response.status(400).json({ success: false, message: "معرّف الشركة مطلوب ويجب أن يكون رقمًا موجبًا" });
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
      message: "يرجى إدخال بريد إلكتروني صحيح وكلمة مرور لا تقل عن 8 أحرف",
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
    return response.status(400).json({ success: false, message: "رمز التحديث مطلوب" });
  }

  try {
    await authService.logout(request.user.sub, accessToken, refreshToken);
    return response.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    return sendAuthError(response, error);
  }
}

async function login_employee(request, response) {
        //   deviceIdentifier: input.device_identifier,
        // deviceName: input.deviceName,
  const { username, password, device_identifier, deviceName  } = request.body || {};

  if (!username || !password || !device_identifier || !deviceName ) {
    return response.status(400).json({ success: false, message: "معلومات تسجيل الدخول او بيانات الهاتف غير صحيحه" });
  }

  try {

    const data = await authService.loginEmployee({  username, password, device_identifier, deviceName });
    return response.json({ success: true, data });
  } catch (error) {
    return sendAuthError(response, error);
  }
}

async function refreshToken(request, response) {
  const { refresh_token: token } = request.body || {};

  if (typeof token !== "string" || token.length === 0) {
    return response.status(400).json({ success: false, message: "رمز التحديث مطلوب" });
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
      message: "جميع الحقول مطلوبة",
    });
  }

  if (newPassword !== confirmPassword) {
    return response.status(400).json({
      success: false,
      message: "تأكيد كلمة المرور غير مطابق",
    });
  }
  if (newPassword.length < 8) {
    return response.status(400).json({
      success: false,
      message: "يجب ألا تقل كلمة المرور الجديدة عن 8 أحرف",
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
