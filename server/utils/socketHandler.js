const ChatMessage = require("../models/ChatMessage");
const User = require("../models/User");

const getActiveSessions = async () => {
  try {
    const sessionsAgg = await ChatMessage.aggregate([
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: "$sessionId",
          lastMessage: { $first: "$message" },
          lastMessageAt: { $first: "$createdAt" },
          userPageUrl: { $first: "$userPageUrl" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$read", false] },
                    { $ne: ["$senderRole", "super-admin"] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { lastMessageAt: -1 }
      }
    ]);

    const sessions = [];
    for (const sess of sessionsAgg) {
      const user = await User.findById(sess._id).select("name email position avatar");
      if (user) {
        sessions.push({
          sessionId: sess._id,
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            position: user.position,
            avatar: user.avatar,
          },
          lastMessage: sess.lastMessage,
          lastMessageAt: sess.lastMessageAt,
          userPageUrl: sess.userPageUrl,
          unreadCount: sess.unreadCount,
        });
      }
    }
    return sessions;
  } catch (err) {
    console.error("getActiveSessions error:", err.message);
    return [];
  }
};

const initSocketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join user room
    socket.on("join_session", async ({ sessionId }) => {
      socket.join(sessionId);
      console.log(`Socket ${socket.id} joined session room: ${sessionId}`);
    });

    // Join admin group
    socket.on("join_admin_panel", async () => {
      socket.join("admin_support_room");
      console.log(`Socket ${socket.id} joined admin support room`);
      // Send active sessions list to newly connected admin
      const sessions = await getActiveSessions();
      socket.emit("session_list_updated", sessions);
    });

    // Handle sending message
    socket.on("send_message", async (data) => {
      const { sessionId, senderId, senderName, senderRole, message, userPageUrl } = data;
      if (!sessionId || !senderId || !message) return;

      try {
        const newMessage = await ChatMessage.create({
          sessionId,
          senderId,
          senderName,
          senderRole,
          message,
          userPageUrl: userPageUrl || "",
          read: senderRole === "super-admin", // Admin messages are read, user messages are unread
        });

        // Emit message to everyone in the session room (user + viewing admin)
        io.to(sessionId).emit("receive_message", newMessage);

        // Update admin panel sessions list
        const sessions = await getActiveSessions();
        io.to("admin_support_room").emit("session_list_updated", sessions);
      } catch (err) {
        console.error("send_message socket error:", err.message);
      }
    });

    // Handle marking a session as read
    socket.on("mark_as_read", async ({ sessionId }) => {
      if (!sessionId) return;
      try {
        await ChatMessage.updateMany(
          { sessionId, senderRole: { $ne: "super-admin" }, read: false },
          { read: true }
        );
        const sessions = await getActiveSessions();
        io.to("admin_support_room").emit("session_list_updated", sessions);
      } catch (err) {
        console.error("mark_as_read socket error:", err.message);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = { initSocketHandler, getActiveSessions };
