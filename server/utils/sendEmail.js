const SibApiV3Sdk = require("sib-api-v3-sdk");

/**
 * Send notification email via Brevo API with rich HTML and Priority/Due Date badges
 */
const sendNotificationEmail = async (userEmail, userName, messageTitle, messageBody, metadata = {}) => {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      console.error("BREVO_API_KEY is not defined in environment variables.");
      return false;
    }

    const senderEmail = process.env.SENDER_EMAIL;
    if (!senderEmail) {
      console.error("SENDER_EMAIL is not defined in environment variables.");
      return false;
    }

    // Configure Brevo client authentication
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKeyAuth = defaultClient.authentications["api-key"];
    apiKeyAuth.apiKey = apiKey;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    const priority = metadata.priority || "Normal";
    const dueDate = metadata.dueDate ? new Date(metadata.dueDate) : null;
    const formattedDueDate = dueDate && !isNaN(dueDate.getTime()) ? dueDate.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }) : null;

    let priorityBadgeHtml = "";
    if (priority === "Urgent") {
      priorityBadgeHtml = `<span style="display:inline-block; background-color:#fee2e2; color:#b91c1c; font-weight:bold; font-size:11px; padding:3px 8px; border-radius:12px; border:1px solid #f87171; margin-right:8px;">🔥 URGENT PRIORITY</span>`;
    } else if (priority === "Confidential") {
      priorityBadgeHtml = `<span style="display:inline-block; background-color:#f3e8ff; color:#7e22ce; font-weight:bold; font-size:11px; padding:3px 8px; border-radius:12px; border:1px solid #c084fc; margin-right:8px;">🔒 CONFIDENTIAL</span>`;
    }

    let dueDateHtml = "";
    if (formattedDueDate) {
      dueDateHtml = `<div style="margin-top:8px; font-size:12px; color:#4b5563;"><strong>⏰ SLA / Due Date:</strong> <span style="color:#111827; font-weight:600;">${formattedDueDate}</span></div>`;
    }

    sendSmtpEmail.subject = `[Notification${priority === "Urgent" ? " - URGENT" : ""}] ${messageTitle}`;
    sendSmtpEmail.htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #1e293b; background-color: #f8fafc; line-height: 1.5;">
        <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div style="background-color: #4f46e5; padding: 18px 24px; color: #ffffff;">
            <h1 style="margin: 0; font-size: 17px; font-weight: 700; letter-spacing: 0.5px;">CodeBloom Document Workflow System</h1>
          </div>
          <div style="padding: 24px;">
            <h2 style="font-size: 16px; margin-top: 0; color: #0f172a;">Hello ${userName},</h2>
            <p style="font-size: 14px; color: #475569;">You have received a new update regarding a workflow document:</p>
            
            <div style="background-color: #f1f5f9; padding: 16px; border-left: 4px solid #4f46e5; border-radius: 8px; margin: 18px 0;">
              <div style="margin-bottom: 6px;">
                ${priorityBadgeHtml}
                <strong style="font-size: 14px; color: #0f172a;">${messageTitle}</strong>
              </div>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #334155;">${messageBody}</p>
              ${dueDateHtml}
            </div>

            <p style="font-size: 13px; color: #475569;">Please log in to your dashboard to review the document and complete your action.</p>
            
            <div style="margin-top: 24px; text-align: left;">
              <a href="http://localhost:3000/dashboard" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 13px; padding: 10px 20px; border-radius: 8px;">Open Workflow Dashboard</a>
            </div>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 32px;"/>
            <p style="font-size: 11px; color: #94a3b8; margin: 0;">This is an automated system notification from the Document Tracking System. Please do not reply directly to this email.</p>
          </div>
        </div>
      </div>
    `;

    sendSmtpEmail.sender = { name: "Document Tracking System", email: senderEmail };
    sendSmtpEmail.to = [{ email: userEmail, name: userName }];

    // Dispatch email using Brevo API
    try {
      const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log(`Notification email sent to ${userEmail} via Brevo:`, data?.messageId || "Success");
      return true;
    } catch (error) {
      console.error("Brevo Email Error Details:", error.response?.body || error.message || error);
      return false;
    }
  } catch (error) {
    console.error("Brevo Email Service Error:", error.message || error);
    return false;
  }
};

/**
 * Send polite, rich HTML Overdue / SLA Reminder Email to the current holder
 */
const sendOverdueReminderEmail = async (userEmail, userName, doc) => {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) return false;

    const senderEmail = process.env.SENDER_EMAIL;
    if (!senderEmail) return false;

    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKeyAuth = defaultClient.authentications["api-key"];
    apiKeyAuth.apiKey = apiKey;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    const dueDate = doc.dueDate ? new Date(doc.dueDate) : null;
    const formattedDueDate = dueDate && !isNaN(dueDate.getTime()) ? dueDate.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }) : "SLA Deadline Exceeded";

    const priority = doc.priority || "Normal";

    sendSmtpEmail.subject = `[ACTION REQUIRED] Overdue Workflow Reminder: ${doc.trackingId} - ${doc.title}`;
    sendSmtpEmail.htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #1e293b; background-color: #f8fafc; line-height: 1.5;">
        <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #fee2e2; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.08);">
          <div style="background-color: #dc2626; padding: 18px 24px; color: #ffffff;">
            <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; color: #fecaca;">SLA / Due Date Alert</div>
            <h1 style="margin: 4px 0 0 0; font-size: 18px; font-weight: 700;">Overdue Document Action Reminder</h1>
          </div>
          <div style="padding: 24px;">
            <p style="font-size: 14px; color: #334155; margin-top: 0;">Hello <strong>${userName}</strong>,</p>
            <p style="font-size: 14px; color: #475569;">
              This is a friendly reminder that workflow document <strong>${doc.trackingId}</strong> currently assigned to you has passed its scheduled SLA completion deadline.
            </p>
            
            <div style="background-color: #fff1f2; padding: 16px; border: 1px solid #fecdd3; border-left: 4px solid #e11d48; border-radius: 8px; margin: 18px 0;">
              <div style="font-size: 14px; font-weight: 700; color: #9f1239; margin-bottom: 6px;">
                ${doc.title}
              </div>
              <div style="font-size: 12px; color: #475569; margin-bottom: 4px;">
                <strong>Tracking ID:</strong> <code style="background:#ffe4e6; color:#9f1239; padding:2px 6px; border-radius:4px; font-family:monospace;">${doc.trackingId}</code>
              </div>
              <div style="font-size: 12px; color: #475569; margin-bottom: 4px;">
                <strong>Priority:</strong> <span style="font-weight:700; color:${priority === "Urgent" ? "#b91c1c" : "#4b5563"};">${priority.toUpperCase()}</span>
              </div>
              <div style="font-size: 12px; color: #e11d48; font-weight:600;">
                <strong>Scheduled Deadline:</strong> ${formattedDueDate}
              </div>
            </div>

            <p style="font-size: 13px; color: #475569;">
              To ensure campus operations and workflow turnaround times remain on schedule, please review, accept, or forward this document as soon as possible.
            </p>
            
            <div style="margin-top: 24px; text-align: left;">
              <a href="http://localhost:3000/dashboard" style="display: inline-block; background-color: #e11d48; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 13px; padding: 10px 22px; border-radius: 8px; box-shadow: 0 2px 4px rgba(225, 29, 72, 0.2);">Review Document on Dashboard</a>
            </div>

            <hr style="border: none; border-top: 1px solid #f1f5f9; margin-top: 32px;"/>
            <p style="font-size: 11px; color: #94a3b8; margin: 0;">Automated SLA compliance reminder • CodeBloom Document Workflow System</p>
          </div>
        </div>
      </div>
    `;

    sendSmtpEmail.sender = { name: "Document Tracking System", email: senderEmail };
    sendSmtpEmail.to = [{ email: userEmail, name: userName }];

    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`Overdue reminder email sent to ${userEmail} for ${doc.trackingId}:`, data?.messageId || "Success");
    return true;
  } catch (error) {
    console.error("sendOverdueReminderEmail error:", error.response?.body || error.message || error);
    return false;
  }
};

module.exports = {
  sendNotificationEmail,
  sendOverdueReminderEmail,
};
