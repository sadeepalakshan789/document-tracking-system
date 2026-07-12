const express = require("express");
const {
  registerUser,
  verifyOTP,
  loginUser,
  resendOTP,
  getCampusPositions,
  getCurrentUser,
  updateCurrentUser,
  getUsers,
  getUsersForAdmin,
  getUserByAdmin,
  getUserActivityByAdmin,
  createUserByAdmin,
  updateUserByAdmin,
  deleteUserByAdmin,
} = require("../controllers/authController");
const { protect, admin } = require("../middleware/auth");
const router = express.Router();

router.get("/positions", getCampusPositions);
router.post("/register", registerUser);
router.post("/verify-otp", verifyOTP);
router.post("/login", loginUser);
router.post("/resend-otp", resendOTP);
router.get("/users", protect, getUsers);
router.get("/me", protect, getCurrentUser);
router.put("/me", protect, updateCurrentUser);
router.get("/admin/users", protect, admin, getUsersForAdmin);
router.get("/admin/users/:id/activity", protect, admin, getUserActivityByAdmin);
router.get("/admin/users/:id", protect, admin, getUserByAdmin);
router.post("/admin/users", protect, admin, createUserByAdmin);
router.put("/admin/users/:id", protect, admin, updateUserByAdmin);
router.delete("/admin/users/:id", protect, admin, deleteUserByAdmin);

module.exports = router;
