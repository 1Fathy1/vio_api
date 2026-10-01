const pool = require("../../config/db");
const model = require("./settings.model");

function validateSettings(settings) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    throw new Error("INVALID_SETTINGS");
  }

  const entries = Object.entries(settings);
  if (!entries.length || entries.some(([key, value]) => !key.trim() || value === undefined || value === null)) {
    throw new Error("INVALID_SETTINGS");
  }

  return Object.fromEntries(entries);
}

async function updateAppSettings(settings) {
  return model.upsertAppSettings(pool, validateSettings(settings));
}

async function updateAttendanceSettings(settings) {
  return model.upsertAttendanceSettings(pool, validateSettings(settings));
}

async function attendanceRules(companyId) {
  const roules = await model.attendanceRules(pool, companyId);
  console.log(roules) ;
}

module.exports = {
  getLocation: (id, companyId) => model.location(pool, id, companyId),
  getHrProfile: (id) => model.hrProfile(pool, id),
  updateHrProfile: (id, data) => model.hrProfileUpdate(pool, id, data),
  getAppSettings: () => model.listAppSettings(pool),
  updateAppSettings,
  getAttendanceSettings: () => model.listAttendanceSettings(pool),
  updateAttendanceSettings,
  attendanceRules
};