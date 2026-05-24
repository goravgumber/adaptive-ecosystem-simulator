const express = require("express");
const os = require("os");
const router = express.Router();
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/auth");
const Simulation = require("../models/Simulation");

const startTime = Date.now();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const dbStatus = mongoose.connection.readyState === 1 ? "Connected " : "Disconnected ";

    const memoryUsage = process.memoryUsage();
    const cpuLoad = os.loadavg()[0].toFixed(2);

    const activeUsers = await Simulation.distinct("userId");
    const activeUserCount = activeUsers.length;

    res.json({
      status: "OK",
      uptime: `${uptime}s`,
      dbStatus,
      memory: {
        rss: (memoryUsage.rss / 1024 / 1024).toFixed(2) + " MB",
        heapUsed: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + " MB",
      },
      cpuLoad,
      activeUsers: activeUserCount,
      lastChecked: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch system metrics" });
  }
});

module.exports = router;
