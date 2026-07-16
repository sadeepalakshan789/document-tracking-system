const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { getEffectiveRole, isAdminUser } = require("../utils/roles");

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "defaultsecret123");

      const user = await User.findById(decoded.id).select("_id name email role position");
      if (!user) {
        return res.status(401).json({ message: "Not authorized, user not found" });
      }

      const effectiveRole = getEffectiveRole(user);

      req.user = {
        id: user._id,
        name: user.name,
        email: user.email,
        position: user.position || "",
        role: effectiveRole,
      };

      next();
    } catch (error) {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};


const admin = (req, res, next) => {
  if (req.user && isAdminUser(req.user)) {
    next();
  } else {
    res.status(401).json({ message: "Not authorized as an admin" });
  }
};

module.exports = { protect, admin };
