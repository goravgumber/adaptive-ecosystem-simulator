const express = require("express");
const authMiddleware = require("../middleware/auth");
const Alert = require("../models/Alert");
const logger = require("../config/logger");

const alertsRoutesFactory = (io) => {
  const router = express.Router();

  router.get("/", authMiddleware, async (req, res) => {
    try {
      const { category = "ecosystem", type: severity, limit = 50 } = req.query;
      const query = { userId: req.user.id };
      if (category !== "all") query.category = category;
      if (severity && severity !== "all") query.type = severity;

      const alerts = await Alert.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));

      res.json(alerts);
    } catch (err) {
      logger.error("Error fetching alerts: %s", err.message);
      res.status(500).json({ error: "Server error" });
    }
  });

  router.patch("/:id/dismiss", authMiddleware, async (req, res) => {
    try {
      const alert = await Alert.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.id },
        { dismissed: true },
        { new: true }
      );
      if (!alert) return res.status(404).json({ error: "Alert not found" });
      res.json({ success: true });
    } catch (err) {
      logger.error("Error dismissing alert: %s", err.message);
      res.status(500).json({ error: "Server error" });
    }
  });

  return router;
};

module.exports = alertsRoutesFactory;
