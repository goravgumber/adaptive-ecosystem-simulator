const AppError = require("./AppError");

const requireRole = (...allowedRoles) => (req, _res, next) => {
  const role = req.user?.role || (req.user?.isAdmin ? "admin" : "user");

  if (!allowedRoles.includes(role)) {
    return next(new AppError("Insufficient permissions", 403));
  }

  return next();
};

module.exports = requireRole;
