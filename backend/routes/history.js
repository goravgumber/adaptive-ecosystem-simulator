const express = require("express");
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/auth");
const Simulation = require("../models/Simulation");
const logger = require("../config/logger");

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const { outcome, limit = 20 } = req.query;
    const match = { userId: new mongoose.Types.ObjectId(req.user.id) };
    if (outcome && outcome !== "all") match.outcome = outcome;

    const sessions = await Simulation.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$sessionId",
          startedAt: { $min: "$createdAt" },
          endedAt: { $max: "$endedAt" },
          outcome: { $first: "$outcome" },
          peakPlants: { $max: "$plants" },
          peakHerbivores: { $max: "$herbivores" },
          peakCarnivores: { $max: "$carnivores" },
          totalTicks: { $sum: 1 },
          currentPlants: { $last: "$plants" },
          currentHerbivores: { $last: "$herbivores" },
          currentCarnivores: { $last: "$carnivores" },
        },
      },
      { $sort: { startedAt: -1 } },
      { $limit: parseInt(limit) },
    ]);

    const now = Date.now();
    const enriched = sessions.map((s) => ({
      id: s._id,
      startedAt: s.startedAt,
      endedAt: s.endedAt || null,
      outcome: s.outcome || "running",
      peakPlants: s.peakPlants,
      peakHerbivores: s.peakHerbivores,
      peakCarnivores: s.peakCarnivores,
      totalTicks: s.totalTicks,
      currentPlants: s.currentPlants,
      currentHerbivores: s.currentHerbivores,
      currentCarnivores: s.currentCarnivores,
      duration: s.endedAt
        ? new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()
        : now - new Date(s.startedAt).getTime(),
    }));

    res.json(enriched);
  } catch (err) {
    logger.error("History fetch error: %s", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:sessionId", authMiddleware, async (req, res) => {
  try {
    const ticks = await Simulation.find({
      userId: req.user.id,
      sessionId: req.params.sessionId,
    }).sort({ step: 1 }).lean();
    res.json(ticks);
  } catch (err) {
    logger.error("Session detail fetch error: %s", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
