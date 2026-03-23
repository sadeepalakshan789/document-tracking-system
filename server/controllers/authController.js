const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomInt } = require("crypto");
const { Resend } = require("resend");

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || "defaultsecret123", {
    expiresIn: "30d",
  });
};

const normalizeEmail = (email = "") => email.trim().toLowerCase();
const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_EMAIL_REGEX = /^.+\s<[^<>\s@]+@[^\s@]+\.[^\s@]+>$/;

const getFromAddress = () => {
  const rawFrom = (process.env.RESEND_FROM || "").trim().replace(/^"|"$/g, "");

  if (SIMPLE_EMAIL_REGEX.test(rawFrom) || NAME_EMAIL_REGEX.test(rawFrom)) {
    return rawFrom;
  }

  console.warn(
    "Invalid RESEND_FROM format. Falling back to Document Tracking System <onboarding@resend.dev>"
  );
  return "Document Tracking System <delivered@resend.dev";
};

const sendOTP = async (email, otp) => {
  const resendApiKey = process.env.RESEND_API || process.env.RESEND_API_KEY;
  const fromAddress = getFromAddress();

  if (!resendApiKey) {
    console.error("RESEND_API (or RESEND_API_KEY) is missing in environment variables.");
    return { sent: false, error: "Resend API key not configured" };
  }

  try {
    const resend = new Resend(resendApiKey);

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: "OTP Verification - Document Tracking System",
      html: `
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
    });

    if (error) {
      throw new Error(error.message || "Failed to send email with Resend");
    }

    console.log(`OTP email sent via Resend to ${email}`);
    return { sent: true, messageId: data?.id };
  } catch (err) {
    console.error(`Error sending OTP email via Resend to ${email}:`, err.message);
    return { sent: false, error: err.message };
  }
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!name || !normalizedEmail || !password) {
      return res.status(400).json({ message: "Please add all fields" });
    }

    const userExists = await User.findOne({ email: normalizedEmail });

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const otp = randomInt(100000, 1000000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60000);

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: role || "user",
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

    user.verified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    return res.json({
      _id: user.id,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    console.error("Verify OTP error:", error.message);
    return res.status(500).json({ message: "OTP verification failed" });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ email: normalizedEmail });

  if (user && (await bcrypt.compare(password, user.password))) {
    if (!user.verified) {
      return res.status(401).json({
        message: "Please verify your email using OTP first",
        needsOTP: true,
        email: normalizedEmail,
      });
    }

    return res.json({
      _id: user.id,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  }

  return res.status(401).json({ message: "Invalid credentials" });
};

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

module.exports = { registerUser, verifyOTP, loginUser, resendOTP };
