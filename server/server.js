const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { ensureCampusPositions } = require("./config/campusPositions");

const startServer = async () => {
  await connectDB();
  await ensureCampusPositions();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1gb" }));
  app.use(express.urlencoded({ limit: "1gb", extended: true }));

  app.use("/api/auth", require("./routes/authRoutes"));
  app.use("/api/documents", require("./routes/documentRoutes"));
  app.use("/api/notifications", require("./routes/notificationRoutes"));
  app.use("/api/admin", require("./routes/adminRoutes")); // RBAC admin routes

  app.get("/", (req, res) => res.send("API Running"));

  app.listen(process.env.PORT || 5000, () => console.log("Server running"));
};

startServer();
