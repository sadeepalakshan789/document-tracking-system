const express = require("express");
const { getChatHistory } = require("../controllers/chatController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.get("/history/:sessionId", protect, getChatHistory);

module.exports = router;
