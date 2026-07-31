const ChatMessage = require("../models/ChatMessage");

// GET /api/chat/history/:sessionId
const getChatHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({ message: "sessionId is required" });
    }

    // Only allow the user themselves OR admins/super-admins to access this chat history
    const isSuperAdmin =
      req.user.role === "super-admin" ||
      req.user.role === "SUPER_ADMIN" ||
      req.user.role === "admin";

    if (!isSuperAdmin && String(req.user.id) !== String(sessionId)) {
      return res.status(403).json({ message: "You are not authorized to access this chat history" });
    }

    const messages = await ChatMessage.find({ sessionId }).sort({ createdAt: 1 });
    return res.json(messages);
  } catch (error) {
    console.error("getChatHistory error:", error.message);
    return res.status(500).json({ message: "Failed to fetch chat history" });
  }
};

module.exports = { getChatHistory };
