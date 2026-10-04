const express = require("express");
const controller = require("./attendance.controller");
const { requireAuth } = require("../../middleware/auth.middleware");
const { verifyRegisteredDevice } = require("../../middleware/device.middleware");
const { verifyLocation } = require("../../middleware/location.middleware");
const router = express.Router();

router.use(requireAuth);

router.post("/check-in", verifyRegisteredDevice, verifyLocation, controller.checkIn);
router.post("/check-out", verifyRegisteredDevice, verifyLocation, controller.checkOut);
router.get("/history", controller.history);
router.get("/history/:id", controller.historyEmployee);
router.get("/employee-list", controller.listByEmployee);
router.get("/employee-list-daley", controller.listDaleyByEmployee);
router.post("/verification-location", controller.location);


// router.get("/records/:id", controller.details);
// router.post("/adjustments", controller.adjust);
// router.get("/requests", controller.requests);
// router.post("/requests", controller.requests);
// router.put("/requests/:id", controller.requests);
// router.get("/today", controller.today);
// router.get("/late", controller.late);
// router.get("/absent", controller.absent);
module.exports = router;
