const bcrypt = require("bcrypt");
const pool = require("../../config/db");
const employeeModel = require("./employee.model");
const userModel = require("../auth/models/user.model");
const transactionModel = require("../auth/models/transaction.model");

async function list(filters) {
  const [data, total] = await Promise.all([
    employeeModel.list(pool, filters),
    employeeModel.count(pool, filters),
  ]);
  return { data, pagination: { page: filters.page, limit: filters.limit, total } };
}

async function findById(id, company) {
  const employee = await employeeModel.findById(pool, id, company);
  if (!employee) throw new Error("EMPLOYEE_NOT_FOUND");
  return employee;
}

async function create(input, company) {
  const client = await pool.connect();
  try {
    await transactionModel.begin(client);
    try {
      if (!(await employeeModel.findDepartment(client, input.department_id, company))) {
        throw new Error("DEPARTMENT_NOT_FOUND");
      }

      const employee = await employeeModel.create(client, {
        name: input.full_name,
        company,
        employeeId: input.employee_id,
        departmentId: input.department_id,
        jobTitle: input.job_title,
        phoneNumber: input.phone,
        username: input.username,
        password: input.password,
        startTime: input.start_time,
        endTime: input.end_time,
        status: input.status || "active",
      });

      await transactionModel.commit(client);
      return employee;
    } catch (error) {
      await transactionModel.rollback(client);
      if (error.code === "23505") throw new Error("EMPLOYEE_ALREADY_EXISTS");
      throw error;
    }
  } finally {
    client.release();
  }
}

async function update(id, input, company) {
  const allowed = {};
  if (input.name) allowed.name = input.name;
  if (input.department_id) {
    if (!(await employeeModel.findDepartment(pool, input.department_id, company))) {
      throw new Error("DEPARTMENT_NOT_FOUND");
    }
    allowed.department_id = input.department_id;
  }
  if (input.job_title) allowed.job_title = input.job_title;
  if (input.hire_date) allowed.hire_date = input.hire_date;
  if (input.status) allowed.status = input.status;
  if (!Object.keys(allowed).length) throw new Error("NO_FIELDS_TO_UPDATE");
  const employee = await employeeModel.update(pool, id, allowed, company);
  if (!employee) throw new Error("EMPLOYEE_NOT_FOUND");
  return employee;
}

async function remove(id, company) {
  const client = await pool.connect();
  try {
    await transactionModel.begin(client);
    const deleted = await employeeModel.deleteById(client, id, company);
    if (!deleted) throw new Error("EMPLOYEE_NOT_FOUND");
    if (!(await userModel.deleteById(client, deleted.user_id, company))) {
      throw new Error("EMPLOYEE_NOT_FOUND");
    }
    await transactionModel.commit(client);
  } catch (error) {
    await transactionModel.rollback(client);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { list, findById, create, update, remove };
