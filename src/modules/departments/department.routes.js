const express = require("express");
const controller = require("./department.controller");
const { requireAuth } = require("../../middleware/auth.middleware");
const router = express.Router();

router.use(requireAuth);

router.get("/", controller.list);
router.get("/:id/attendance", controller.attendance);
router.get("/:id", controller.details);
router.post("/", controller.create);
router.post("/transfer", controller.transfer);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);
module.exports = router;
