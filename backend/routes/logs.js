const express = require("express");
const authMiddleware = require("../middleware/auth");
const Log = require("../models/Log");
const logger = require("../config/logger");

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const { limit = 200, level, search } = req.query;
    const query = { userId: req.user.id };
    if (level && level !== "all") query.level = level;
    if (search) query.message = { $regex: search, $options: "i" };

    const logs = await Log.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(logs);
  } catch (err) {
    logger.error("Logs fetch error: %s", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
