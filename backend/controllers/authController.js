const authService = require("../services/authService");
const { sendSuccess } = require("../utils/responseFormatter");

const signup = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = await authService.signup({ username, password });
    return sendSuccess(res, user, 201, "User created successfully");
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const result = await authService.login({ username, password });
    return sendSuccess(res, result, 200, "Login successful");
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const result = await authService.refresh(req.body.refreshToken);
    return sendSuccess(res, result, 200, "Token refreshed successfully");
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const result = await authService.logout({
      accessToken: req.accessToken,
      refreshToken: req.body.refreshToken,
      userId: req.user.id,
    });
    return sendSuccess(res, result, 200, "Logged out successfully");
  } catch (err) {
    next(err);
  }
};

const logoutAll = async (req, res, next) => {
  try {
    const result = await authService.logoutAll(req.user.id);
    return sendSuccess(res, result, 200, "All sessions revoked successfully");
  } catch (err) {
    next(err);
  }
};

const validateToken = async (req, res, next) => {
  try {
    return sendSuccess(
      res,
      { valid: true, userId: req.user.id, role: req.user.role || "user" },
      200,
      "Token is valid"
    );
  } catch (err) {
    next(err);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user.id);
    return sendSuccess(res, { user }, 200, "Profile fetched successfully");
  } catch (err) {
    next(err);
  }
};

module.exports = { signup, login, refresh, logout, logoutAll, validateToken, getProfile };
