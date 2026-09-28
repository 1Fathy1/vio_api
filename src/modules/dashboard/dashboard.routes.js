const express = require("express");
const dashboardController = require("./dashboard.controller");
const { requireAuth } = require("../../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

router.get("/stats", dashboardController.getStats);
// router.get("/charts", dashboardController.getCharts);   // cansel
// router.get("/activities", dashboardController.getActivities);  // لاغي
router.get("/todays-attendance", dashboardController.getTodaysAttendance);

module.exports = router;
