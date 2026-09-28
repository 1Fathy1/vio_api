const pool = require("../../config/db");
const model = require("./department.model");
const transaction = require("../auth/models/transaction.model");

async function find(id, company) { const data = await model.findById(pool, id, company); if (!data) throw new Error("DEPARTMENT_NOT_FOUND"); return data; }
async function create(input, company) { return model.create(pool, input, company); }
async function update(id, input, company) {
  const data = {};
  if (input.name) data.name = input.name;
  if (input.default_check_in_time) data.default_check_in = input.default_check_in_time;
  if (input.default_check_out_time) data.default_check_out = input.default_check_out_time;
  if (input.notes !== undefined) data.notes = input.notes;
  if (!Object.keys(data).length) throw new Error("NO_FIELDS_TO_UPDATE");
  const result = await model.update(pool, id, data, company);
  if (!result) throw new Error("DEPARTMENT_NOT_FOUND");
  return result;
}
async function remove(id, company) {
  if (await model.employeeCount(pool, id, company) > 0) throw new Error("DEPARTMENT_HAS_EMPLOYEES");
  if (!await model.remove(pool, id, company)) throw new Error("DEPARTMENT_NOT_FOUND");
}
async function transfer(input, company) {
  if (!Array.isArray(input.employee_ids) || !input.employee_ids.length) throw new Error("EMPLOYEES_REQUIRED");
  const department = await model.findById(pool, input.department_id, company);
  if (!department) throw new Error("DEPARTMENT_NOT_FOUND");
  const employeeIds = [...new Set(input.employee_ids)];
  const updatedCount = await model.transfer(pool, employeeIds, input.department_id, company);
  if (updatedCount !== employeeIds.length) throw new Error("EMPLOYEE_NOT_FOUND");
}
async function attendance(id, date, company) { return model.attendance(pool, id, date || new Date().toISOString().slice(0, 10), company); }
module.exports = { list: (company) => model.list(pool, company), find, create, update, remove, transfer, attendance };
