const express = require("express");
const controller = require("./settings.controller");
const { requireAuth } = require("../../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);

router.get("/location/:id", controller.getLocation);
router.get("/hr-profile", controller.getHrProfile);
router.put("/hr-profile-update/:id", controller.updateProfile);

module.exports = router;