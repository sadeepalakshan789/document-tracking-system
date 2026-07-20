const SibApiV3Sdk = require("sib-api-v3-sdk");

/**
 * Send notification email via Brevo API
 */
const sendNotificationEmail = async (userEmail, userName, messageTitle, messageBody) => {
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

    sendSmtpEmail.subject = `[Notification] ${messageTitle}`;
    sendSmtpEmail.htmlContent = `
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

module.exports = { sendNotificationEmail };