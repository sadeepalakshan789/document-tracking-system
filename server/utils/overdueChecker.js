const Document = require("../models/Document");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { sendOverdueReminderEmail } = require("./sendEmail");

/**
 * Scan for documents that have passed their due date / SLA deadline
 * and dispatch polite automated reminder emails & in-app alerts to current holders.
 */
const checkOverdueDocuments = async () => {
  try {
    const now = new Date();

    // Find active documents past their dueDate
    const overdueDocs = await Document.find({
      status: { $ne: "Completed" },
      dueDate: { $ne: null, $lt: now },
      "currentHolder.userId": { $exists: true, $ne: null },
    });

    if (!overdueDocs || overdueDocs.length === 0) {
      return 0;
    }

    let notifiedCount = 0;

    for (const doc of overdueDocs) {
      const currIdx = doc.currentHolderIndex ?? 0;
      const currentStep = doc.route && doc.route[currIdx] ? doc.route[currIdx] : null;

      // Only notify once per step / current holder
      const alreadyNotifiedForThisStep = currentStep?.overdueNotified === true;
      if (alreadyNotifiedForThisStep) {
        continue;
      }

      const holderUserId = doc.currentHolder?.userId || currentStep?.userId;
      if (!holderUserId) continue;

      const holder = await User.findById(holderUserId).select("name email emailAlerts inAppNotifications");
      if (!holder || !holder.email) continue;

      // 1. Send Rich Overdue Email Reminder if email alerts enabled
      if (holder.emailAlerts !== false) {
        sendOverdueReminderEmail(holder.email, holder.name, doc).catch((err) => {
          console.error(`Failed to send overdue email for ${doc.trackingId}:`, err.message);
        });
      }

      // 2. Create in-app Notification if in-app alerts enabled
      if (holder.inAppNotifications !== false) {
        const dueDateStr = doc.dueDate ? new Date(doc.dueDate).toLocaleDateString() : "deadline";
        await Notification.create({
          userId: holder._id,
          documentId: doc._id,
          trackingId: doc.trackingId,
          type: "overdue",
          message: `Action Required: Document ${doc.trackingId} ("${doc.title}") has passed its SLA deadline (${dueDateStr}). Please review or forward.`,
        }).catch((err) => {
          console.error("Failed to create overdue in-app notification:", err.message);
        });
      }

      // 3. Update flags so we don't spam the holder repeatedly
      doc.overdueNotified = true;
      if (currentStep) {
        currentStep.overdueNotified = true;
      }

      doc.history.push({
        action: "OVERDUE_ALERT_SENT",
        description: `Automated SLA overdue reminder sent to current holder ${holder.name}.`,
        actorId: null,
        actorName: "System Automation",
        timestamp: now,
      });

      await doc.save();
      notifiedCount += 1;
    }

    if (notifiedCount > 0) {
      console.log(`[Overdue Checker] Processed ${notifiedCount} overdue document reminder(s).`);
    }

    return notifiedCount;
  } catch (error) {
    console.error("[Overdue Checker Error]:", error.message);
    return 0;
  }
};

/**
 * Initialize periodic background checker (every 15 minutes)
 */
const initOverdueChecker = () => {
  // Run an initial scan 10 seconds after server startup
  setTimeout(() => {
    checkOverdueDocuments();
  }, 10000);

  // Periodic recurring check every 15 minutes (900,000 ms)
  const INTERVAL_MS = 15 * 60 * 1000;
  const intervalId = setInterval(() => {
    checkOverdueDocuments();
  }, INTERVAL_MS);

  return intervalId;
};

module.exports = {
  checkOverdueDocuments,
  initOverdueChecker,
};
