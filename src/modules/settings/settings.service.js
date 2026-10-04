const pool = require("../../config/db");
const model = require("./settings.model");

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

async function extractCoordinates(url) {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
    });

    const finalUrl = response.url;

    let match = finalUrl.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);

    if (match) {
      return {
        latitude: Number(match[1]),
        longitude: Number(match[2]),
      };
    }

    match = finalUrl.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);

    if (match) {
      return {
        latitude: Number(match[1]),
        longitude: Number(match[2]),
      };
    }

    return null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function updateLocation(companyId, body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("INVALID_LOCATION");
  }

  const coordinates = await extractCoordinates(body.location_url);
  console.log(coordinates)
  
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

async function updateAttendanceRules(companyId, settings) {
  const roules = await model.updateAttendanceSettings(pool, companyId, settings);
  return roules;
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
  updateAttendanceRules
};