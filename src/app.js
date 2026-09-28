const express = require("express");
const cors = require("cors");
const databaseModel = require("./config/database.model");
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");
const authRoutes = require("./modules/auth/auth.routes");
const employeeRoutes = require("./modules/employees/employee.routes");
const departmentRoutes = require("./modules/departments/department.routes");
const attendanceRoutes = require("./modules/attendance/attendance.routes");
const settingsRoutes = require("./modules/settings/settings.routes");
const shiftRoutes = require("./modules/shifts/shift.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/employees", employeeRoutes);
app.use("/api/v1/departments", departmentRoutes);
app.use("/api/v1/attendance", attendanceRoutes);
app.use("/api/v1/setting", settingsRoutes);
app.use("/api/v1/shifts", shiftRoutes);

app.get("/", (_request, response) => {
  response.json({ message: "API Running" });
});

app.get("/test-db", async (_request, response) => {
  try {
    response.json({
      success: true,
      data: await databaseModel.getCurrentTime(),
    });
  } catch (error) {
    console.error("Database test failed:", error.message);

    response.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

module.exports = app;
