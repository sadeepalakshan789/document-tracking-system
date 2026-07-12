const Notification = require("../models/Notification");

const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json(notifications);
  } catch (error) {
    console.error("getMyNotifications error:", error.message);
    return res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.json(notification);
  } catch (error) {
    console.error("markNotificationRead error:", error.message);
    return res.status(500).json({ message: "Failed to mark notification as read" });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
    return res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("markAllNotificationsRead error:", error.message);
    return res.status(500).json({ message: "Failed to mark notifications as read" });
  }
};

module.exports = {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
