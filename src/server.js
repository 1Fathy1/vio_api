require("dotenv").config();

const app = require("./app");
const databaseModel = require("./config/database.model");

const port = Number(process.env.PORT || 3000);


async function startServer() {
  try {
    await databaseModel.testConnection();
    console.log("Database connection established successfully");

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}

startServer();
