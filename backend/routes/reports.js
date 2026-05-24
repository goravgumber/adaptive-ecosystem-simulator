const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const Simulation = require("../models/Simulation");

const cache = require("../utils/cache");
const logger = require("../config/logger");

router.get("/summary", authMiddleware, async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 0;
    const cacheKey = `reports:summary:${req.user.id}:${limit}`;

    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const data = await Simulation.find({ userId: req.user.id })
      .sort({ step: 1 })
      .limit(limit > 0 ? limit : 0);

    if (!data.length) {
      return res.json({ data: [], summary: null });
    }

    const keys = ["plants", "herbivores", "carnivores"];

    const summary = {
      avg: {},
      max: {},
      min: {},
    };

    keys.forEach((key) => {
      const values = data.map((d) => d[key]);
      summary.avg[key] = (
        values.reduce((a, b) => a + b, 0) / values.length
      ).toFixed(1);
      summary.max[key] = Math.max(...values);
      summary.min[key] = Math.min(...values);
    });

    const responsePayload = { data, summary };

    await cache.set(cacheKey, responsePayload, 60);

    res.json(responsePayload);
  } catch (err) {
    logger.error("Failed to fetch reports: %s", err.message);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

module.exports = router;
