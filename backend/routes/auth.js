const express = require("express");
const { body } = require("express-validator");
const authMiddleware = require("../middleware/auth");
const validateRequest = require("../middleware/validateRequest");
const { validate } = require("../middleware/validate");
const { loginLimiter, registerLimiter } = require("../middleware/rateLimiter");
const { signupSchema, loginSchema, refreshSchema, logoutSchema } = require("../validators/authValidator");
const {
  signup,
  login,
  refresh,
  logout,
  logoutAll,
  validateToken,
  getProfile,
} = require("../controllers/authController");

const router = express.Router();
const registerValidation = validate([
  body("email").isEmail().withMessage("Invalid email format"),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  body("username").notEmpty().withMessage("Username is required"),
]);

const loginValidation = validate([
  body("username").notEmpty().withMessage("Username is required"),
  body("password").notEmpty().withMessage("Password is required"),
]);

/**
 * @route   POST /api/v1/auth/signup
 * @desc    Register new user
 * @access  Public
 */
router.post("/signup", registerLimiter, validateRequest(signupSchema), signup);
router.post("/register", registerLimiter, registerValidation, validateRequest(signupSchema), signup);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post("/login", loginLimiter, loginValidation, validateRequest(loginSchema), login);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Rotate refresh token and issue a new access token
 * @access  Public
 */
router.post("/refresh", validateRequest(refreshSchema), refresh);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Revoke current access token and optional refresh token
 * @access  Private
 */
router.post("/logout", authMiddleware, validateRequest(logoutSchema), logout);

/**
 * @route   POST /api/v1/auth/logout-all
 * @desc    Revoke all refresh tokens for this user
 * @access  Private
 */
router.post("/logout-all", authMiddleware, logoutAll);

/**
 * @route   GET /api/v1/auth/validate
 * @desc    Validate access token
 * @access  Private
 */
router.get("/validate", authMiddleware, validateToken);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get authenticated user profile
 * @access  Private
 */
router.get("/me", authMiddleware, getProfile);

module.exports = router;
