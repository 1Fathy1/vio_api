const service = require("./employee.service");

function errorResponse(response, error) {
  const map = {
    EMPLOYEE_NOT_FOUND: [404, "Employee not found"],
    EMPLOYEE_ALREADY_EXISTS: [409, "Employee already exists"],
    DEPARTMENT_NOT_FOUND: [404, "Department not found"],
    NO_FIELDS_TO_UPDATE: [400, "No fields to update"],
  };
  const [status, message] = map[error.message] || [500, "Employee request failed"];
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
    return response.status(400).json({ success: false, message: "All employee fields are required" });
  }
  try { return response.status(201).json({ success: true, data: await service.create(body, request.user.company) }); }
  catch (error) { return errorResponse(response, error); }
}

async function update(request, response) {
  try { return response.json({ success: true, data: await service.update(request.params.id, request.body , request.user.company) }); }
  catch (error) { return response.json({ status : false, error : error.message}); }
}

async function remove(request, response) {
  try { await service.remove(request.params.id, request.user.company); return response.json({ success: true, message: "Employee deleted successfully" }); }
  catch (error) { return errorResponse(response, error); }
}

module.exports = { list, details, create, update, remove };
