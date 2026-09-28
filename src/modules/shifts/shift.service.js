const pool = require("../../config/db");
const model = require("./shift.model");

async function list(filters) {
  const [data, total] = await Promise.all([
    model.list(pool, filters),
    model.count(pool, filters.search, filters.company),
  ]);
  return { data, pagination: { page: filters.page, limit: filters.limit, total } };
}

async function findById(id, company) {
  const shift = await model.findById(pool, id, company);
  if (!shift) throw new Error("SHIFT_NOT_FOUND");
  return shift;
}

async function create(input, company) {
  try {
    return await model.create(pool, input, company);
  } catch (error) {
    if (error.code === "23505") throw new Error("SHIFT_ALREADY_EXISTS");
    throw error;
  }
}

async function update(id, input, company) {
  const allowed = {};
  if (input.name !== undefined) allowed.name = input.name;
  if (input.start_time !== undefined) allowed.start_time = input.start_time;
  if (input.end_time !== undefined) allowed.end_time = input.end_time;
  if (input.grace_period_mins !== undefined) allowed.grace_period_mins = input.grace_period_mins;
  if (!Object.keys(allowed).length) throw new Error("NO_FIELDS_TO_UPDATE");

  const shift = await model.update(pool, id, allowed, company);
  if (!shift) throw new Error("SHIFT_NOT_FOUND");
  return shift;
}

async function remove(id, company) {
  if (!(await model.remove(pool, id, company))) throw new Error("SHIFT_NOT_FOUND");
}

async function assign(input, company) {
  if (!(await model.findById(pool, input.shift_id, company))) throw new Error("SHIFT_NOT_FOUND");
  if (!(await model.employeeExists(pool, input.employee_id, company))) throw new Error("EMPLOYEE_NOT_FOUND");
  if (input.expiry_date && input.expiry_date < input.effective_date) {
    throw new Error("INVALID_ASSIGNMENT_RANGE");
  }
  return model.assign(pool, {
    shiftId: input.shift_id,
    employeeId: input.employee_id,
    company,
    effectiveDate: input.effective_date,
    expiryDate: input.expiry_date || null,
  });
}

function schedule(input) {
  return model.schedule(pool, input);
}

module.exports = { list, findById, create, update, remove, assign, schedule };