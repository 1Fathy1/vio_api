const service = require("./shift.service");

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function errorResponse(response, error) {
  const map = {
    SHIFT_NOT_FOUND: [404, "Shift not found"],
    SHIFT_ALREADY_EXISTS: [409, "Shift already exists"],
    EMPLOYEE_NOT_FOUND: [404, "Employee not found"],
    INVALID_ASSIGNMENT_RANGE: [400, "expiry_date must be on or after effective_date"],
    NO_FIELDS_TO_UPDATE: [400, "No fields to update"],
  };
  const [status, message] = map[error.message] || [500, "Shift request failed"];
  if (status === 500) console.error("Shift request failed:", error);
  return response.status(status).json({ success: false, message });
}

function validId(id) { return uuidPattern.test(id); }
function validDate(value) { return typeof value === "string" && datePattern.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)); }
function validTime(value) { return typeof value === "string" && timePattern.test(value); }

async function list(request, response) {
  const page = Math.max(Number.parseInt(request.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(request.query.limit, 10) || 20, 1), 100);
  try {
    return response.json({ success: true, ...(await service.list({ page, limit, offset: (page - 1) * limit, search: request.query.search, company: request.user.company })) });
  } catch (error) { return errorResponse(response, error); }
}

async function details(request, response) {
  if (!validId(request.params.id)) return response.status(400).json({ success: false, message: "id must be a valid UUID" });
  try { return response.json({ success: true, data: await service.findById(request.params.id, request.user.company) }); }
  catch (error) { return errorResponse(response, error); }
}

async function create(request, response) {
  const body = request.body || {};
  const grace = body.grace_period_mins === undefined ? 15 : Number(body.grace_period_mins);
  if (typeof body.name !== "string" || !body.name.trim() || !validTime(body.start_time) || !validTime(body.end_time) || !Number.isInteger(grace) || grace < 0) {
    return response.status(400).json({ success: false, message: "name, valid start_time/end_time, and non-negative grace_period_mins are required" });
  }
  try { return response.status(201).json({ success: true, data: await service.create({ name: body.name.trim(), startTime: body.start_time, endTime: body.end_time, gracePeriodMins: grace }, request.user.company) }); }
  catch (error) { return errorResponse(response, error); }
}

async function update(request, response) {
  if (!validId(request.params.id)) return response.status(400).json({ success: false, message: "id must be a valid UUID" });
  const body = request.body || {};
  if (body.name !== undefined && (typeof body.name !== "string" || !body.name.trim())) return response.status(400).json({ success: false, message: "name must not be empty" });
  if (body.start_time !== undefined && !validTime(body.start_time) || body.end_time !== undefined && !validTime(body.end_time)) return response.status(400).json({ success: false, message: "start_time and end_time must be valid times" });
  if (body.grace_period_mins !== undefined && (!Number.isInteger(Number(body.grace_period_mins)) || Number(body.grace_period_mins) < 0)) return response.status(400).json({ success: false, message: "grace_period_mins must be a non-negative integer" });
  try { return response.json({ success: true, data: await service.update(request.params.id, body, request.user.company) }); }
  catch (error) { return errorResponse(response, error); }
}

async function remove(request, response) {
  if (!validId(request.params.id)) return response.status(400).json({ success: false, message: "id must be a valid UUID" });
  try { await service.remove(request.params.id, request.user.company); return response.json({ success: true, message: "Shift deleted successfully" }); }
  catch (error) { return errorResponse(response, error); }
}

async function assign(request, response) {
  const body = request.body || {};
  if (!validId(body.shift_id) || !validId(body.employee_id) || !validDate(body.effective_date) || (body.expiry_date !== undefined && !validDate(body.expiry_date))) return response.status(400).json({ success: false, message: "shift_id, employee_id, and valid dates are required" });
  try { return response.status(201).json({ success: true, data: await service.assign(body, request.user.company) }); }
  catch (error) { return errorResponse(response, error); }
}

async function schedule(request, response) {
  const dateFrom = request.query.date_from || new Date().toISOString().slice(0, 10);
  const dateTo = request.query.date_to || dateFrom;
  if (!validDate(dateFrom) || !validDate(dateTo) || dateTo < dateFrom || (request.query.employee_id && !validId(request.query.employee_id)) || (request.query.shift_id && !validId(request.query.shift_id))) return response.status(400).json({ success: false, message: "valid date range and UUID filters are required" });
  try { return response.json({ success: true, data: await service.schedule({ dateFrom, dateTo, employeeId: request.query.employee_id, shiftId: request.query.shift_id, company: request.user.company }) }); }
  catch (error) { return errorResponse(response, error); }
}

module.exports = { list, details, create, update, remove, assign, schedule };