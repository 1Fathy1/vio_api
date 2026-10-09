const service = require("./employee.service");

function errorResponse(response, error) {
  const map = {
    EMPLOYEE_NOT_FOUND: [404, "الموظف غير موجود"],
    EMPLOYEE_ALREADY_EXISTS: [409, "الموظف مسجل بالفعل"],
    DEPARTMENT_NOT_FOUND: [404, "القسم غير موجود"],
    NO_FIELDS_TO_UPDATE: [400, "لا توجد بيانات لتحديثها"],
    NAME_REQUIRED: [400, "اسم الموظف مطلوب"],
    START_TIME_REQUIRED: [400, "وقت بدء العمل مطلوب"],
    END_TIME_REQUIRED: [400, "وقت انتهاء العمل مطلوب"],
    USERNAME_REQUIRED: [400, "اسم المستخدم مطلوب"],
    PASSWORD_REQUIRED: [400, "كلمة المرور مطلوبة"],
    STATUS_REQUIRED: [400, "حالة الموظف مطلوبة"],
  };
  const [status, message] = map[error.message] || [500, "تعذر إتمام طلب الموظف، يرجى المحاولة لاحقًا"];
  if (status === 500) console.error(error);
  return response.status(status).json({ success: false, message });
}

function pagination(request) {
  const page = Math.max(Number.parseInt(request.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(request.query.limit, 10) || 20, 1), 100);
  return { page, limit, offset: (page - 1) * limit };
}

async function list(request, response) {
  try {
    const result = await service.list(request.user.company);

    return response.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    return errorResponse(response, error);
  }
}

async function details(request, response) {
  try { return response.json({ success: true, data: await service.findById(request.params.id, request.user.company) }); }
  catch (error) { return errorResponse(response, error); }
}

async function create(request, response) {
  const body = request.body || {};
  const required = [
    "full_name",
    "phone",
    "employee_id",
    "department_id",
    "job_title",
    "username",
    "password",
    "start_time",
    "end_time"
  ];
  if (required.some((field) => typeof body[field] !== "string" || !body[field].trim())) {
    return response.status(400).json({ success: false, message: "جميع بيانات الموظف مطلوبة" });
  }
  try { return response.status(201).json({ success: true, data: await service.create(body, request.user.company) }); }
  catch (error) { return errorResponse(response, error); }
}

async function update(request, response) {
  try { return response.json({ success: true, data: await service.update(request.params.id, request.body , request.user.company) }); }
  catch (error) { return errorResponse(response, error); }
}

async function remove(request, response) {
  try { await service.remove(request.params.id, request.user.company); return response.json({ success: true, message: "Employee deleted successfully" }); }
  catch (error) { return errorResponse(response, error); }
}

module.exports = { list, details, create, update, remove };
