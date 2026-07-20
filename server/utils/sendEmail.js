const { BrevoClient } = require('@getbrevo/brevo');

/**
 * Generic function to send a notification alert email to a user
 */
const sendNotificationEmail = async (userEmail, userName, messageTitle, messageBody) => {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      console.warn("BREVO_API_KEY is not set in environment variables. Email notification skipped.");
      return false;
    }

    const brevoClient = new BrevoClient({ apiKey });

    // 💡 Construct the SmtpEmail object payload
    const sendSmtpEmail = {
      subject: `[Notification] ${messageTitle}`,
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2>Hello ${userName},</h2>
          <p>You have received a new update on the Document Tracking System:</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-left: 4px solid #7c3aed; border-radius: 4px; margin: 20px 0;">
            <strong>${messageTitle}</strong><br/>
            <p style="margin-top: 5px;">${messageBody}</p>
          </div>
          <p>Please log in to your dashboard to take necessary actions.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin-top: 30px;"/>
          <p style="font-size: 12px; color: #6b7280;">This is an automated system notification. Please do not reply directly to this email.</p>
        </div>
      `,
      sender: { name: "Document Tracking System", email: process.env.SENDER_EMAIL || "noreply@documenttracking.com" },
      to: [{ email: userEmail, name: userName }]
    };

    await brevoClient.transactionalEmails.sendTransacEmail(sendSmtpEmail);
    console.log(`Email successfully sent to ${userEmail}.`);
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${userEmail}:`, error.message || error);
    return false;
  }
};

module.exports = { sendNotificationEmail };