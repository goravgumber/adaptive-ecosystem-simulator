const express = require("express");
const authMiddleware = require("../middleware/auth");
const { signup, login, validateToken, getProfile } = require("../controllers/authController");

const router = express.Router();

/**
 * @route   POST /api/auth/signup
 * @desc    Register new user
 * @access  Public
 */
router.post("/signup", signup);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post("/login", login);

/**
 * @route   GET /api/auth/validate
 * @desc    Validate access token
 * @access  Private
 */
router.get("/validate", authMiddleware, validateToken);

/**
 * @route   GET /api/auth/me
 * @desc    Get authenticated user profile
 * @access  Private
 */
router.get("/me", authMiddleware, getProfile);

module.exports = router;
