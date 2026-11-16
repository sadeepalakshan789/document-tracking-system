const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const { randomInt } = require("crypto");
const SibApiV3Sdk = require("sib-api-v3-sdk");
const CampusPosition = require("../models/CampusPosition");
const Notification = require("../models/Notification");
const Document = require("../models/Document");
const {
  ADMIN_ROLE,
  USER_ROLE,
  SUPER_ADMIN_POSITION,
  getEffectiveRole,
  resolveRoleFromPosition,
  isSuperAdminPosition,
} = require("../utils/roles");

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || "defaultsecret123", {
    expiresIn: "30d",
  });
};

const normalizeEmail = (email = "") => email.trim().toLowerCase();
const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_EMAIL_REGEX = /^.+\s<[^<>\s@]+@[^\s@]+\.[^\s@]+>$/;
const PRIORITY_POSITIONS = [SUPER_ADMIN_POSITION, "Admin"];

const getFromAddress = () => {
  const senderEmail = process.env.SENDER_EMAIL || "noreply@documenttracking.com";
  return { name: "Document Tracking System", email: senderEmail };
};

const getBrevoClient = () => {
  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  defaultClient.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;
  return new SibApiV3Sdk.TransactionalEmailsApi();
};

const sendOTP = async (email, otp) => {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const sender = getFromAddress();

  if (!brevoApiKey) {
    console.error("BREVO_API_KEY is missing in environment variables.");
    return { sent: false, error: "Brevo API key not configured" };
  }

  const sendSmtpEmail = {
    sender,
    to: [{ email }],
    subject: "OTP Verification - Document Tracking System",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Email Verification</h2>
        <p>Hello,</p>
        <p>Your OTP for registration is:</p>
        <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
          <h1 style="color: #2563eb; letter-spacing: 5px; margin: 0; text-align: center;">${otp}</h1>
        </div>
        <p>This OTP is valid for 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #666; font-size: 12px;">Document Tracking System</p>
      </div>
    `,
  };

  try {
    const apiInstance = getBrevoClient();
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log(`OTP email sent via Brevo to ${email} from ${sender.email}`);
    return { sent: true, messageId: result.messageId || null };
  } catch (err) {
    const errMsg = err?.response?.body || err?.message || JSON.stringify(err);
    console.error("Brevo Email Error Details:", errMsg);
    return { sent: false, error: errMsg };
  }
};

// ─────────────────────────────────────────────
//  registerUser
// ─────────────────────────────────────────────
const registerUser = async (req, res) => {
  try {
    const { name, email, position, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const trimmedPosition = (position || "").trim();

    if (!name || !normalizedEmail || !trimmedPosition || !password) {
      return res.status(400).json({ message: "Please add all fields" });
    }

    const userExists = await User.findOne({ email: normalizedEmail });

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const otp = randomInt(100000, 1000000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60000);

    // The User model's pre-save hook handles bcrypt hashing automatically.
    // Pass the plain-text password directly – no manual hashing needed here.
    const user = await User.create({
      name,
      email: normalizedEmail,
      position: trimmedPosition,
      password: hashedPassword,
      role: resolveRoleFromPosition(trimmedPosition, USER_ROLE),
      verified: false,
      otp,
      otpExpires,
    });

    const emailResult = await sendOTP(normalizedEmail, otp);

    if (!emailResult.sent) {
      console.error(
        `User created for ${normalizedEmail}, but OTP email failed to send: ${emailResult.error}`
      );
    }

    return res.status(201).json({
      message: emailResult.sent
        ? "User registered. OTP sent to your email."
        : "User registered, but OTP email could not be delivered. Please use Resend OTP.",
      email: user.email,
      emailSent: emailResult.sent,
    });
  } catch (error) {
    console.error("Register error:", error.message);
    return res.status(500).json({ message: "Registration failed" });
  }
};

// ─────────────────────────────────────────────
//  verifyOTP
// ─────────────────────────────────────────────
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) return res.status(400).json({ message: "User not found" });
    if (user.verified) return res.status(400).json({ message: "Already verified" });

    const isOtpValid =
      user.otp === otp &&
      user.otpExpires &&
      user.otpExpires.getTime() > Date.now();

    if (!isOtpValid) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const effectiveRole = getEffectiveRole(user);

    user.verified = true;
    user.role = effectiveRole;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    return res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      position: user.position || "",
      role: effectiveRole,
      token: generateToken(user._id, effectiveRole),
    });
  } catch (error) {
    console.error("Verify OTP error:", error.message);
    return res.status(500).json({ message: "OTP verification failed" });
  }
};

// ─────────────────────────────────────────────
//  loginUser
//  Includes status check – blocked users are denied a token at login time.
// ─────────────────────────────────────────────
const loginUser = async (req, res) => {
  const { password } = req.body;
  const identifier = req.body.identifier || req.body.email;

  if (!identifier || !password) {
    return res.status(400).json({ message: "Identifier and password are required" });
  }

  let trimmedIdentifier = identifier.trim();
  if (trimmedIdentifier === 'admin') {
    trimmedIdentifier = 'itt2023029@tec.rjt.ac.lk';
  }

  // Find user by email (case-insensitive) OR by full name (name)
  const user = await User.findOne({
    $or: [
      { email: trimmedIdentifier.toLowerCase() },
      { name: trimmedIdentifier }
    ]
  }).select("+password");

  if (user && (await bcrypt.compare(password, user.password))) {
    if (!user.verified) {
      return res.status(401).json({
        message: "Please verify your email using OTP first",
        needsOTP: true,
        email: user.email,
      });
    }

    const effectiveRole = getEffectiveRole(user);

    if (user.role !== effectiveRole) {
      user.role = effectiveRole;
      await user.save();
    }

    return res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      position: user.position || "",
      role: effectiveRole,
      token: generateToken(user._id, effectiveRole),
    });
  }

  return res.status(401).json({ message: "Invalid credentials" });
};

// ─────────────────────────────────────────────
//  resendOTP
// ─────────────────────────────────────────────
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.verified) {
      return res.status(400).json({ message: "User is already verified" });
    }

    const otp = randomInt(100000, 1000000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60000);

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    const emailResult = await sendOTP(normalizedEmail, otp);

    if (!emailResult.sent) {
      return res.status(502).json({
        message: "Failed to send OTP email. Please try again.",
        email: user.email,
        emailSent: false,
      });
    }

    return res.status(200).json({
      message: "OTP sent to your email.",
      email: user.email,
      emailSent: true,
    });
  } catch (error) {
    console.error("Resend OTP error:", error.message);
    return res.status(500).json({ message: "Failed to resend OTP" });
  }
};

// ─────────────────────────────────────────────
//  getCampusPositions
// ─────────────────────────────────────────────
const getCampusPositions = async (req, res) => {
  try {
    const positions = await CampusPosition.find({ active: true })
      .sort({ name: 1 })
      .select("name -_id")
      .lean();

    const positionNames = positions.map((position) => position.name);
    const orderedPositions = [...PRIORITY_POSITIONS, ...positionNames];
    const normalizedSeen = new Set();

    const uniquePositions = orderedPositions.filter((positionName) => {
      const normalizedName = positionName.trim().toLowerCase();
      if (!normalizedName || normalizedSeen.has(normalizedName)) {
        return false;
      }

      normalizedSeen.add(normalizedName);
      return true;
    });

    return res.json(uniquePositions);
  } catch (error) {
    console.error("getCampusPositions error:", error.message);
    return res.status(500).json({ message: "Failed to load campus positions" });
  }
};

// ─────────────────────────────────────────────
//  getCurrentUser
// ─────────────────────────────────────────────
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("_id name email position role status verified avatar phone emailAlerts inAppNotifications");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      position: user.position || "",
      role: getEffectiveRole(user),
      verified: user.verified,
      avatar: user.avatar || "",
      phone: user.phone || "",
      emailAlerts: user.emailAlerts !== undefined ? user.emailAlerts : true,
      inAppNotifications: user.inAppNotifications !== undefined ? user.inAppNotifications : true,
    });
  } catch (error) {
    console.error("getCurrentUser error:", error.message);
    return res.status(500).json({ message: "Failed to load current user" });
  }
};

// ─────────────────────────────────────────────
//  updateCurrentUser
// ─────────────────────────────────────────────
const updateCurrentUser = async (req, res) => {
  try {
    const {
      name,
      email,
      position,
      currentPassword = "",
      newPassword = "",
      confirmNewPassword = "",
      phone,
      emailAlerts,
      inAppNotifications,
    } = req.body;

    // password is select:false – include it so we can verify current password
    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Partial profile updates with existing saved values as fallbacks
    if (typeof name === "string" && name.trim()) {
      user.name = name.trim();
    }

    // Role check: Normal Users cannot change position, only Admin / Super Admin can
    const effectiveRole = getEffectiveRole(user);
    const isAdmin = ["admin", "super-admin", "superadmin", "super_admin"].includes(
      String(effectiveRole || user.role || "").toLowerCase()
    );

    if (isAdmin && typeof position === "string" && position.trim()) {
      user.position = position.trim();
    }

    if (phone !== undefined) {
      user.phone = typeof phone === "string" ? phone.trim() : "";
    }

    if (emailAlerts !== undefined) {
      user.emailAlerts = !!emailAlerts;
    }
    if (inAppNotifications !== undefined) {
      user.inAppNotifications = !!inAppNotifications;
    }

    const wantsPasswordChange = !!(currentPassword || newPassword || confirmNewPassword);
    if (wantsPasswordChange) {
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required" });
      }
      if (!newPassword) {
        return res.status(400).json({ message: "New password is required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }
      if (confirmNewPassword && newPassword !== confirmNewPassword) {
        return res.status(400).json({ message: "New password and confirmation do not match" });
      }

      const passwordMatches = await bcrypt.compare(currentPassword, user.password);
      if (!passwordMatches) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      if (currentPassword === newPassword) {
        return res.status(400).json({ message: "New password must be different from current password" });
      }

      // Assign plain-text password – pre-save hook in User.js hashes it automatically
      user.password = newPassword;
    }

    await user.save();

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      position: user.position || "",
      role: effectiveRole,
      verified: user.verified,
      avatar: user.avatar || "",
      phone: user.phone || "",
      emailAlerts: user.emailAlerts !== undefined ? user.emailAlerts : true,
      inAppNotifications: user.inAppNotifications !== undefined ? user.inAppNotifications : true,
      message: wantsPasswordChange
        ? "Password and profile updated successfully."
        : "Settings saved successfully.",
    });
  } catch (error) {
    console.error("updateCurrentUser error:", error.message);
    return res.status(500).json({ message: error.message || "Failed to update user profile" });
  }
};

// ─────────────────────────────────────────────
//  uploadAvatar
// ─────────────────────────────────────────────
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    if (!allowedMimeTypes.includes(req.file.mimetype) || req.file.size > maxSize) {
      // Delete the file from local disk since it's uploaded by multer
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: "Selected image exceeds the 10MB limit. Please choose a smaller file." });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ message: "User not found" });
    }

    // Optionally delete old avatar from disk
    if (user.avatar) {
      const oldPath = path.join(__dirname, "..", "uploads", user.avatar);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (err) {
          console.error("Failed to delete old avatar:", err.message);
        }
      }
    }

    // Save filename to user avatar field
    user.avatar = req.file.filename;
    await user.save();

    return res.json({
      message: "Avatar uploaded successfully",
      avatar: user.avatar,
    });
  } catch (error) {
    console.error("uploadAvatar error:", error.message);
    // Cleanup uploaded file on error
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        // ignore
      }
    }
    return res.status(500).json({ message: "Failed to upload avatar" });
  }
};

// ─────────────────────────────────────────────
//  getUsers
//  Returns all active, verified non-super-admin users
//  for use in document routing / recipient selection UI.
//  Super-admin accounts are intentionally excluded from workflow paths.
// ─────────────────────────────────────────────
const getUsers = async (req, res) => {
  try {
    // Exclude super-admin accounts — only regular users and campus admins
    // are eligible to be selected as workflow recipients.
    const users = await User.find({
      verified: true,
      status: "active",
      role: { $nin: ["super-admin"] },
    })
      .select("_id name email position role")
      .sort({ name: 1 });

    return res.json(
      users.map((user) => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        position: user.position || "",
        role: getEffectiveRole(user),
      }))
    );
  } catch (error) {
    console.error("getUsers error:", error.message);
    return res.status(500).json({ message: "Failed to load users" });
  }
};

const getUsersForAdmin = async (req, res) => {
  try {
    const users = await User.find({})
      .select("_id name email position role verified createdAt updatedAt avatar")
      .sort({ createdAt: -1 });

    return res.json(
      users.map((user) => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        position: user.position || "",
        role: getEffectiveRole(user),
        verified: user.verified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        avatar: user.avatar || "",
      }))
    );
  } catch (error) {
    console.error("getUsersForAdmin error:", error.message);
    return res.status(500).json({ message: "Failed to load users for admin" });
  }
};

const getUserByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await User.findById(id).select(
      "_id name email position role verified createdAt updatedAt"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      position: user.position || "",
      role: getEffectiveRole(user),
      verified: user.verified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error("getUserByAdmin error:", error.message);
    return res.status(500).json({ message: "Failed to load user profile" });
  }
};

const getUserActivityByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 10), 500);
    const userObjectId = new mongoose.Types.ObjectId(String(id));

    const user = await User.findById(userObjectId).select("_id name email");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const [documentActionRows, senderDocuments, routeDocuments, notificationRows] = await Promise.all([
      Document.aggregate([
        { $match: { "history.actorId": userObjectId } },
        { $unwind: "$history" },
        { $match: { "history.actorId": userObjectId } },
        {
          $project: {
            _id: 0,
            trackingId: "$trackingId",
            documentTitle: "$title",
            action: "$history.action",
            description: "$history.description",
            occurredAt: "$history.timestamp",
          },
        },
      ]),
      Document.find({ "sender.userId": userObjectId })
        .select("trackingId title createdAt")
        .lean(),
      Document.find({ "route.userId": userObjectId })
        .select("trackingId title route")
        .lean(),
      Notification.find({ userId: userObjectId })
        .select("trackingId type message isRead createdAt")
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
    ]);

    const documentActionActivities = documentActionRows.map((row, index) => ({
      id: `doc-action-${row.trackingId || "na"}-${index}`,
      category: "document_action",
      action: row.action || "DOCUMENT_ACTION",
      description: row.description || "Document action recorded.",
      trackingId: row.trackingId || "",
      documentTitle: row.documentTitle || "",
      occurredAt: row.occurredAt || null,
    }));

    const createdDocumentActivities = senderDocuments.map((document) => ({
      id: `doc-created-${document.trackingId || document._id}`,
      category: "document_created",
      action: "DOCUMENT_CREATED",
      description: `Created document ${document.trackingId || ""}${document.title ? ` (${document.title})` : ""}.`,
      trackingId: document.trackingId || "",
      documentTitle: document.title || "",
      occurredAt: document.createdAt || null,
    }));

    const workflowRouteActivities = [];
    routeDocuments.forEach((document) => {
      const matchingSteps = Array.isArray(document.route)
        ? document.route.filter(
          (step) => String(step.userId) === String(userObjectId)
        )
        : [];

      matchingSteps.forEach((step, stepIndex) => {
        if (step.receivedAt) {
          workflowRouteActivities.push({
            id: `route-received-${document.trackingId || document._id}-${stepIndex}`,
            category: "workflow_step",
            action: "STEP_RECEIVED",
            description: `Received workflow step for ${document.trackingId || "document"}.`,
            trackingId: document.trackingId || "",
            documentTitle: document.title || "",
            occurredAt: step.receivedAt,
          });
        }

        if (step.acceptedAt) {
          workflowRouteActivities.push({
            id: `route-accepted-${document.trackingId || document._id}-${stepIndex}`,
            category: "workflow_step",
            action: "STEP_ACCEPTED",
            description: `Accepted workflow step for ${document.trackingId || "document"}.`,
            trackingId: document.trackingId || "",
            documentTitle: document.title || "",
            occurredAt: step.acceptedAt,
          });
        }

        if (step.completedAt) {
          workflowRouteActivities.push({
            id: `route-completed-${document.trackingId || document._id}-${stepIndex}`,
            category: "workflow_step",
            action: "STEP_COMPLETED",
            description: `Completed workflow step for ${document.trackingId || "document"}.`,
            trackingId: document.trackingId || "",
            documentTitle: document.title || "",
            occurredAt: step.completedAt,
          });
        }
      });
    });

    const notificationActivities = notificationRows.map((notification) => ({
      id: `notif-${notification._id}`,
      category: "notification",
      action: `NOTIFICATION_${String(notification.type || "system").toUpperCase()}`,
      description: notification.message || "Notification received.",
      trackingId: notification.trackingId || "",
      documentTitle: "",
      occurredAt: notification.createdAt || null,
      isRead: !!notification.isRead,
    }));

    const activities = [
      ...documentActionActivities,
      ...createdDocumentActivities,
      ...workflowRouteActivities,
      ...notificationActivities,
    ]
      .filter((activity) => !!activity.occurredAt)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, limit);

    return res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
      summary: {
        total: activities.length,
        documentActions: documentActionActivities.length,
        documentsCreated: createdDocumentActivities.length,
        workflowSteps: workflowRouteActivities.length,
        notifications: notificationActivities.length,
      },
      activities,
    });
  } catch (error) {
    console.error("getUserActivityByAdmin error:", error.message);
    return res.status(500).json({ message: "Failed to load user activity" });
  }
};

const createUserByAdmin = async (req, res) => {
  try {
    const {
      name = "",
      email = "",
      position = "",
      password = "",
      verified = true,
      role = USER_ROLE,
    } = req.body;

    const trimmedName = name.trim();
    const normalizedEmail = normalizeEmail(email);
    const trimmedPosition = position.trim();

    if (!trimmedName || !normalizedEmail || !trimmedPosition || !password) {
      return res.status(400).json({ message: "Name, email, position, and password are required" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail }).select("_id");
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const normalizedRole = String(role || USER_ROLE).trim().toLowerCase();
    const requestedRole = normalizedRole === ADMIN_ROLE ? ADMIN_ROLE : USER_ROLE;
    const effectiveRole = resolveRoleFromPosition(trimmedPosition, requestedRole);

    const user = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      position: trimmedPosition,
      password: hashedPassword,
      role: effectiveRole,
      verified: Boolean(verified),
    });

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      position: user.position || "",
      role: getEffectiveRole(user),
      verified: user.verified,
      message: "User created successfully by admin.",
    });
  } catch (error) {
    console.error("createUserByAdmin error:", error.message);
    return res.status(500).json({ message: "Failed to create user" });
  }
};

const updateUserByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const {
      name,
      email,
      position,
      role,
      verified,
      password,
    } = req.body;

    if (typeof name === "string") {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return res.status(400).json({ message: "Name cannot be empty" });
      }
      user.name = trimmedName;
    }

    if (typeof email === "string") {
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail) {
        return res.status(400).json({ message: "Email cannot be empty" });
      }

      const emailInUse = await User.findOne({
        _id: { $ne: user._id },
        email: normalizedEmail,
      }).select("_id");

      if (emailInUse) {
        return res.status(400).json({ message: "Email is already in use by another account" });
      }

      user.email = normalizedEmail;
    }

    if (typeof position === "string") {
      const trimmedPosition = position.trim();
      if (!trimmedPosition) {
        return res.status(400).json({ message: "Position cannot be empty" });
      }
      user.position = trimmedPosition;
    }

    if (typeof verified === "boolean") {
      user.verified = verified;
    }

    if (typeof password === "string" && password.trim()) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password.trim(), salt);
    }

    const normalizedRole = String(role || user.role || USER_ROLE).trim().toLowerCase();
    const requestedRole = normalizedRole === ADMIN_ROLE ? ADMIN_ROLE : USER_ROLE;
    user.role = resolveRoleFromPosition(user.position || "", requestedRole);

    await user.save();

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      position: user.position || "",
      role: getEffectiveRole(user),
      verified: user.verified,
      message: "User updated successfully by admin.",
    });
  } catch (error) {
    console.error("updateUserByAdmin error:", error.message);
    return res.status(500).json({ message: "Failed to update user" });
  }
};

const deleteUserByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    if (String(id) === String(req.user.id)) {
      return res.status(400).json({ message: "You cannot remove your own account" });
    }

    const user = await User.findById(id).select("_id name email position");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (isSuperAdminPosition(user.position) && !isSuperAdminPosition(req.user.position || "")) {
      return res.status(403).json({ message: "Only Admin (Super) can remove another Admin (Super)" });
    }

    await User.deleteOne({ _id: user._id });
    await Notification.deleteMany({ userId: user._id });

    return res.json({
      message: "User removed successfully.",
      removedUser: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("deleteUserByAdmin error:", error.message);
    return res.status(500).json({ message: "Failed to remove user" });
  }
};

// ─────────────────────────────────────────────
//  updateNotificationPreferences
// ─────────────────────────────────────────────
const updateNotificationPreferences = async (req, res) => {
  try {
    const { emailAlerts, inAppNotifications } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (emailAlerts !== undefined) {
      user.emailAlerts = !!emailAlerts;
    }
    if (inAppNotifications !== undefined) {
      user.inAppNotifications = !!inAppNotifications;
    }

    await user.save();

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      position: user.position || "",
      verified: user.verified,
      avatar: user.avatar || "",
      phone: user.phone || "",
      emailAlerts: user.emailAlerts !== undefined ? user.emailAlerts : true,
      inAppNotifications: user.inAppNotifications !== undefined ? user.inAppNotifications : true,
      message: "Notification preferences updated successfully."
    });
  } catch (error) {
    console.error("updateNotificationPreferences error:", error.message);
    return res.status(500).json({ message: "Failed to update notification preferences" });
  }
};

module.exports = {
  registerUser,
  verifyOTP,
  loginUser,
  resendOTP,
  getCampusPositions,
  getCurrentUser,
  updateCurrentUser,
  uploadAvatar,
  getUsers,
  getUsersForAdmin,
  getUserByAdmin,
  getUserActivityByAdmin,
  createUserByAdmin,
  updateUserByAdmin,
  deleteUserByAdmin,
  updateNotificationPreferences,
};
