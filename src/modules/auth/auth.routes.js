const express = require("express");
const authController = require("./auth.controller");
const { requireAuth } = require("../../middleware/auth.middleware");

const router = express.Router();

router.post("/register", authController.register);              // done
router.post("/login", authController.login);                    // done
router.post("/employee-auth/login", authController.login_employee);                    // done
router.post("/logout", requireAuth, authController.logout);
router.post("/refresh-token", authController.refreshToken);
// router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", requireAuth, authController.resetPassword);
// router.post("/verify-otp", authController.verifyOtp);

module.exports = router;
