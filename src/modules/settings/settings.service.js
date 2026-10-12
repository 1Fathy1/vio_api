const pool = require("../../config/db");
const model = require("./settings.model");
const device = require("./../device/device.model")

function validateSettings(settings) {
  console.log("Here?")

  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    throw new Error("INVALID_SETTINGS");
  }

  const entries = Object.entries(settings);
  console.log("Here?")
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

function calculateDeductionDays(totalDelay, rules) {
  if (!Number.isInteger(totalDelay) || totalDelay < 0) {
    throw new Error("INVALID_TOTAL_DELAY");
  }

  const deductionsByMinutes = new Map();
  for (const { setting_key: key, setting_value: value } of rules) {
    const keyMatch = /^(\d+)_min$/.exec(key);
    if (!keyMatch) continue;

    const valueMatch = /^(\d+)(?:\.(\d{1,2}))?_day$/.exec(value);
    if (!valueMatch) {
      throw new Error("INVALID_ATTENDANCE_RULES");
    }

    const minutes = Number(keyMatch[1]);
    if (!Number.isSafeInteger(minutes) || minutes <= 0) {
      throw new Error("INVALID_ATTENDANCE_RULES");
    }

    const fractionalDays = (valueMatch[2] || "").padEnd(2, "0");
    const deductionHundredths = Number(valueMatch[1]) * 100 + Number(fractionalDays);
    deductionsByMinutes.set(minutes, deductionHundredths);
  }

  const fullHours = Math.floor(totalDelay / 60);
  const remainingMinutes = totalDelay % 60;
  const hourlyDeduction = deductionsByMinutes.get(60);
  if (fullHours > 0 && hourlyDeduction === undefined) {
    throw new Error("INVALID_ATTENDANCE_RULES");
  }

  let totalDeductionHundredths = fullHours * (hourlyDeduction || 0);
  const remainingRule = [...deductionsByMinutes.entries()]
    .filter(([minutes]) => minutes < 60 && minutes <= remainingMinutes)
    .sort(([first], [second]) => second - first)[0];

  if (remainingRule) {
    totalDeductionHundredths += remainingRule[1];
  }

  return totalDeductionHundredths / 100;
}

function coordinatesFromLocationUrl(locationUrl) {
  if (typeof locationUrl !== "string" || !locationUrl.trim()) {
    throw new Error("INVALID_LOCATION");
  }
  console.log("You are here!!")

  let parsedUrl;
  try {
    parsedUrl = new URL(locationUrl.trim());
  } catch {
    throw new Error("INVALID_LOCATION_URL");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("INVALID_LOCATION_URL");
  }

  let urlText;
  try {
    urlText = decodeURIComponent(locationUrl);
  } catch {
    throw new Error("INVALID_LOCATION_URL");
  }
  const coordinatePatterns = [
    /[?&](?:q|query|ll|center)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/i,
  ];

  for (const pattern of coordinatePatterns) {
    const match = urlText.match(pattern);
    if (!match) continue;

    const latitude = Number(match[1]);
    const longitude = Number(match[2]);
    if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
      return { latitude, longitude };
    }
  }

  throw new Error("INVALID_LOCATION_URL");
}


function parseCoordinates(url) {
  const patterns = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);

    if (match) {
      const latitude = Number(match[1]);
      const longitude = Number(match[2]);

      if (
        latitude >= -90 && latitude <= 90 &&
        longitude >= -180 && longitude <= 180
      ) {
        return { latitude, longitude };
      }
    }
  }

  try {
    const parsedUrl = new URL(url);

    for (const key of ["query", "q", "ll", "center"]) {
      const value = parsedUrl.searchParams.get(key);

      if (!value) continue;

      const match = value.match(
        /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/
      );

      if (match) {
        const latitude = Number(match[1]);
        const longitude = Number(match[2]);

        if (
          latitude >= -90 && latitude <= 90 &&
          longitude >= -180 && longitude <= 180
        ) {
          return { latitude, longitude };
        }
      }
    }
  } catch {
    // الرابط غير صالح
  }

  return null;
}



function findCoordinates(text) {
  const patterns = [
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;

    const latitude = Number(match[1]);
    const longitude = Number(match[2]);

    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      Math.abs(latitude) <= 90 &&
      Math.abs(longitude) <= 180
    ) {
      return { latitude, longitude };
    }
  }

  return null;
}

async function extractCoordinates(url) {
  try {
    const parsed = new URL(url);

    if (
      !["maps.app.goo.gl", "www.google.com",
         "google.com", "maps.google.com"].includes(parsed.hostname)
    ) {
      throw new Error("Unsupported Google Maps URL");
    }

    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!response.ok) {
      throw new Error(`Google returned HTTP ${response.status}`);
    }

    const finalUrl = response.url;
    console.log("Final URL:", finalUrl);

    let result = findCoordinates(finalUrl);
    if (result) return result;

    const html = await response.text();
    console.log("HTML length:", html.length);

    result = findCoordinates(html);
    if (result) return result;

    console.log("Coordinates not found in URL or HTML");
    return null;
  } catch (error) {
    console.error("extractCoordinates:", error.message);
    return null;
  }
}




async function updateLocation(companyId, body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("INVALID_LOCATION");
  }

  console.log(body);

  const coordinates = await extractCoordinates(body.location_url.trim());
  console.log("coordinates : ", coordinates)
  
  return model.updateLocation(pool, companyId, {
    locationUrl: body.location_url.trim(),
    ...coordinates,
    info: body,
  });
}

async function attendanceRules(companyId) {
  const roules = await model.attendanceRules(pool, companyId);
  return roules;
}

async function reportDetails(companyId, startDate, endDate) {
  const rows = await model.reportDetails(pool, companyId, startDate, endDate);
  const rules = await attendanceRules(companyId);
  return rows.map((row) => ({
    name: row.name,
    total_delay: Number(row.total_delay),
    total_deduction: calculateDeductionDays(Number(row.total_delay), rules || []),
  }));
}

async function reportOverview(companyId, startDate, endDate) {
  const row = await model.reportOverview(pool, companyId, startDate, endDate);
  return {
    employees: Number(row.employees),
    total_deduction_day: Number(row.total_deduction_day),
    total_delay_min: Number(row.total_delay_min),
  };
}

async function updateAttendanceRules(companyId, settings) {
  const roules = await model.updateAttendanceSettings(pool, companyId, settings);
  return roules;
}

async function changeRequest(employeeId) {
  const result = await device.changeRequest(pool, employeeId);
  return result;
}

async function deviceInfo(companyId) {
  const result = await device.deviceInfo(pool, companyId);
  return result;
}

async function allowLogin(employeeId, deviceId) {
  const result = await device.allowLogin(pool, employeeId, deviceId);
  return result;
}

module.exports = {
  getLocation: (id, companyId) => model.location(pool, id, companyId),
  updateLocation,
  getHrProfile: (id) => model.hrProfile(pool, id),
  updateHrProfile: (id, data) => model.hrProfileUpdate(pool, id, data),
  getAppSettings: () => model.listAppSettings(pool),
  updateAppSettings,
  getAttendanceSettings: () => model.listAttendanceSettings(pool),
  updateAttendanceSettings,
  attendanceRules,
  updateAttendanceRules,
  calculateDeductionDays,
  reportDetails,
  reportOverview,
  changeRequest,
  deviceInfo,
  allowLogin
};