const jwt = require("jsonwebtoken");
const AppError = require("./AppError");
const config = require("../config/env");
const { isTokenBlacklisted } = require("../utils/tokenBlacklist");

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Authentication token is required", 401));
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);

    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({ success: false, message: "Token revoked" });
    }

    req.user = decoded;
    req.accessToken = token;
    next();
  } catch (err) {
    return next(new AppError("Invalid or expired token", 401, [{ message: err.message }]));
  }
};

module.exports = authMiddleware;
