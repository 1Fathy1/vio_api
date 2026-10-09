const service = require("./department.service");
function errorResponse(response, error) {
  const map = { DEPARTMENT_NOT_FOUND: [404, "القسم غير موجود"], DEPARTMENT_HAS_EMPLOYEES: [400, "لا يمكن حذف قسم يحتوي على موظفين"], EMPLOYEES_REQUIRED: [400, "يجب تحديد الموظفين"], EMPLOYEE_NOT_FOUND: [404, "الموظف غير موجود"], NO_FIELDS_TO_UPDATE: [400, "لا توجد بيانات لتحديثها"] };
  const [status, message] = map[error.message] || [500, "تعذر إتمام طلب القسم، يرجى المحاولة لاحقًا"];
  if (status === 500) console.error(error);
  return response.status(status).json({ success: false, message });
}
async function list(req, res) { try { return res.json({ success: true, data: await service.list(req.user.company) }); } catch (e) { return errorResponse(res, e); } }
async function details(req, res) { try { return res.json({ success: true, data: await service.find(req.params.id, req.user.company) }); } catch (e) { return errorResponse(res, e); } }
async function create(req, res) { const b = req.body || {}; if (!b.name || !b.default_check_in_time || !b.default_check_out_time) return res.status(400).json({ success: false, message: "اسم القسم وموعدا بدء العمل وانتهائه مطلوبة" }); try { return res.status(201).json({ success: true, data: await service.create(b, req.user.company) }); } catch (e) { return errorResponse(res, e); } }
async function update(req, res) { try { return res.json({ success: true, data: await service.update(req.params.id, req.body || {}, req.user.company) }); } catch (e) { return errorResponse(res, e); } }
async function remove(req, res) { try { await service.remove(req.params.id, req.user.company); return res.json({ success: true, message: "Department deleted successfully" }); } catch (e) { return errorResponse(res, e); } }
async function transfer(req, res) { try { await service.transfer(req.body || {}, req.user.company); return res.json({ success: true, message: "Employees transferred successfully" }); } catch (e) { return errorResponse(res, e); } }
async function attendance(req, res) { try { return res.json({ success: true, data: await service.attendance(req.params.id, req.query.date, req.user.company) }); } catch (e) { return errorResponse(res, e); } }
module.exports = { list, details, create, update, remove, transfer, attendance };
