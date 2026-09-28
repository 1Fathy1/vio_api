const express = require("express");
const controller = require("./shift.controller");
const { requireAuth } = require("../../middleware/auth.middleware");

const router = express.Router();
router.use(requireAuth);
router.get("/schedule", controller.schedule);
router.post("/assign", controller.assign);
router.get("/", controller.list);
router.get("/:id", controller.details);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);

module.exports = router;