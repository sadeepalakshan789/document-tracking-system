const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const { ensureCampusPositions } = require("./config/campusPositions");
const { initSocketHandler } = require("./utils/socketHandler");
const { initOverdueChecker } = require("./utils/overdueChecker");

const startServer = async () => {
  await connectDB();
  await ensureCampusPositions();
  initOverdueChecker();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));

  app.use("/api/auth", require("./routes/authRoutes"));
  app.use("/api/documents", require("./routes/documentRoutes"));
  app.use("/api/notifications", require("./routes/notificationRoutes"));
  app.use("/api/admin", require("./routes/adminRoutes")); // RBAC admin routes
  app.use("/api/chat", require("./routes/chatRoutes"));

  app.get("/", (req, res) => res.send("API Running"));

  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  initSocketHandler(io);

  httpServer.listen(process.env.PORT || 5000, () => console.log("Server running with Socket.io"));
};

startServer();
