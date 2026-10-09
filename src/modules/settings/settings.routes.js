const express = require("express");
const controller = require("./settings.controller");
const { requireAuth } = require("../../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

router.get("/location/:id", controller.getLocation);
router.post("/location", controller.updateLocation);
router.get("/hr-profile", controller.getHrProfile);
router.put("/hr-profile-update/:id", controller.updateProfile);
router.get("/attendance-rules", controller.attendanceRules);
router.put("/attendance-rules", controller.updateAttendanceRules);
router.get("/report/details", controller.reportDetails);
router.get("/report/overviwe", controller.reportOverview);
router.get("/device/change-request",controller.changeRequest ); // under test
router.get("/devices/info",controller.deviceInfo ); // under test
router.put("/devices/allow-login",controller.allowLogin ); // under test

module.exports = router;