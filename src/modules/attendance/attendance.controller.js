const service = require("./attendance.service");
function errorResponse(response, error) {
  const map = { EMPLOYEE_NOT_FOUND: [404, "Employee not found"], CHECK_IN_REQUIRED: [400, "Check-in is required first"], ATTENDANCE_NOT_FOUND: [404, "Attendance record not found"], REQUEST_NOT_FOUND: [404, "Attendance request not found"] };
  const [status, message] = map[error.message] || [500, "Attendance request failed"];
  if (status === 500) console.error(error);
  return response.status(status).json({ success: false, message });
}
function input(request) { const b = request.body || {}; return { latitude: b.latitude, longitude: b.longitude, deviceIdentifier: null, biometricVerified: b.biometric_verified, delay_minutes: Number(b.delay_minutes) || 0 }; }
async function checkIn(req, res) {
  try {
    const data = await service.checkIn(req);

    return res.status(201).json({
      success: true,
      data,
    });
  } catch (e) {
    return errorResponse(res, e);
  }
}

async function checkOut(req, res) { try { return res.status(201).json({ success: true, data: await service.checkOut(req) }); } catch (e) { return errorResponse(res, e); } }

async function history(req, res) {
  try {
    return res.json({
      success: true,
      data: await service.history(req.user.company)
    });
  } catch (e) {
    return errorResponse(res, e);
  }
}

async function listDaleyByEmployee(req, res) {
  try {
    return res.json({
      success: true,
      data: await service.listDaleyByEmployee(req.user.sub, req.user.company)
    });
  } catch (e) {
    return errorResponse(res, e);
  }
}


async function details(req, res) {
  try {
    return res.json({
      success: true,
      data: await service.details(req.params.id, req.user.company)
    });
  } catch (e) { return errorResponse(res, e); }
}

// async function adjust(req, res) { try { return res.json({ success: true, data: await service.adjust(req.user.sub, req.user.company, { ...req.body, id: req.params.id || req.body.id }) }); } catch (e) { return errorResponse(res, e); } }
async function listByEmployee(req, res) {
  try {
    return res.json({
      success: true,
      data: await service.listByEmployee(req.user.sub)
    });
  } catch (e) { return e.message; }
}

async function location(req, res) {
  try {
    return res.json({
      success: true,
      data: await service.location(req)
    });
  } catch (e) {
    return errorResponse(res, e);
  }
}

// async function requests(req, res) { try { return res.json({ success: true, data: await service.requests(req.user.sub, req.user.company, { ...(req.body || {}), ...req.query, id: req.params.id, action: req.method === "POST" ? "create" : req.method === "PUT" ? "update" : "list" }) }); } catch (e) { return errorResponse(res, e); } }

// async function today(req, res) { try { return res.json({ success: true, data: await service.today(req.user.company, req.query.status) }); } catch (e) { return errorResponse(res, e); } }

// async function late(req, res) { try { return res.json({ success: true, data: await service.listByStatus(req.user.company, "late") }); } catch (e) { return errorResponse(res, e); } }

// async function absent(req, res) { try { return res.json({ success: true, data: await service.listByStatus(req.user.company, "absent") }); } catch (e) { return errorResponse(res, e); } }
module.exports = {location, checkIn, checkOut, history, details, listByEmployee, listDaleyByEmployee };
