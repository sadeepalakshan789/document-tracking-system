const Setting = require("../models/Setting");
const AuditLog = require("../models/AuditLog");
const CampusPosition = require("../models/CampusPosition");

// Get settings
const getSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({
        theme: "dark",
        maxFileSize: 10,
        allowedTypes: ["PDF", "JPEG", "Docx"],
        autoArchiveDuration: "30 days",
        slaDeadline: 24,
        enableAutoReminder: true,
        minPasswordLength: 6,
        passwordComplexity: false,
        positions: ["Lecturer", "Head", "Dean", "Registrar",],
        sessionTimeout: 60
      });
    }
    return res.status(200).json(settings);
  } catch (error) {
    console.error("getSettings error:", error.message);
    return res.status(500).json({ message: "Failed to fetch settings" });
  }
};

// Sync positions helper
const syncPositions = async (positionsArray) => {
  // Mark all existing positions as inactive
  await CampusPosition.updateMany({}, { active: false });

  // For each position in positionsArray, upsert as active
  for (const posName of positionsArray) {
    const trimmed = posName.trim();
    if (!trimmed) continue;
    const normalizedName = trimmed.toLowerCase();
    
    await CampusPosition.findOneAndUpdate(
      { normalizedName },
      { name: trimmed, active: true },
      { upsert: true, new: true }
    );
  }
};

// Update settings
const updateSettings = async (req, res) => {
  try {
    const settings = await Setting.findOneAndUpdate({}, req.body, { new: true, upsert: true });

    if (req.body.positions) {
      await syncPositions(req.body.positions);
    }

    // Log action to AuditLog
    await AuditLog.create({
      action: "Updated System Settings",
      actorId: req.user.id,
      timestamp: new Date()
    });

    return res.status(200).json(settings);
  } catch (error) {
    console.error("updateSettings error:", error.message);
    return res.status(500).json({ message: "Failed to update settings" });
  }
};

// Get audit logs
const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate("actorId", "name email role")
      .sort({ timestamp: -1 });
    return res.status(200).json({ logs });
  } catch (error) {
    console.error("getAuditLogs error:", error.message);
    return res.status(500).json({ message: "Failed to fetch audit logs" });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  getAuditLogs
};
