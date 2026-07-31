const express = require("express");
const {
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
} = require("../controllers/authController");
const { protect, admin } = require("../middleware/auth");
const upload = require("../middleware/fileUpload");
const router = express.Router();

router.get("/positions", getCampusPositions);
router.post("/verify-otp", verifyOTP);
router.post("/login", loginUser);
router.post("/resend-otp", resendOTP);
router.get("/users", protect, getUsers);
router.get("/me", protect, getCurrentUser);
router.put("/me", protect, updateCurrentUser);
router.patch("/me/notifications", protect, updateNotificationPreferences);
router.post("/me/avatar", protect, upload.single("avatar"), uploadAvatar);
router.get("/admin/users", protect, admin, getUsersForAdmin);
router.get("/admin/users/:id/activity", protect, admin, getUserActivityByAdmin);
router.get("/admin/users/:id", protect, admin, getUserByAdmin);
router.post("/admin/users", protect, admin, createUserByAdmin);
router.put("/admin/users/:id", protect, admin, updateUserByAdmin);
router.delete("/admin/users/:id", protect, admin, deleteUserByAdmin);

module.exports = router;
