const express = require("express");
const { body } = require("express-validator");
const authMiddleware = require("../middleware/auth");
const { simulationStatusCache, invalidateSimCache } = require("../middleware/simulationCache");
const { validate } = require("../middleware/validate");
const {
  saveSimulation,
  resetSimulation,
  toggleSimulation,
  setSpeed,
  getSimulationStatus,
} = require("../controllers/simulationController");
const Simulation = require("../models/Simulation");
const logger = require("../config/logger");
const snapshotValidation = validate([
  body("plants").optional().isFloat({ min: 1 }).withMessage("plants must be at least 1"),
  body("herbivores").optional().isFloat({ min: 1 }).withMessage("herbivores must be at least 1"),
  body("carnivores").optional().isFloat({ min: 1 }).withMessage("carnivores must be at least 1"),
]);

// Factory function that accepts Socket.IO instance
const simulationRoutesFactory = (io) => {
  const router = express.Router();

  /**
   * @desc Save current simulation step
   * @route POST /api/simulation
   */
  router.post("/", authMiddleware, snapshotValidation, (req, res, next) => {
    // Add io to request object so controllers can access it
    req.io = io;
    saveSimulation(req, res, next);
  });

  /**
   * @desc Reset simulation to initial state
   * @route DELETE /api/simulation/reset
   */
  router.delete("/reset", authMiddleware, async (req, res, next) => {
    await invalidateSimCache();
    req.io = io;
    resetSimulation(req, res, next);
  });

  /**
   * @desc Start/Pause simulation
   * @route POST /api/simulation/toggle
   */
  router.post("/toggle", authMiddleware, async (req, res, next) => {
    await invalidateSimCache();
    req.io = io;
    toggleSimulation(req, res, next);
  });

  /**
   * @desc Adjust simulation speed
   * @route POST /api/simulation/speed
   */
  router.post("/speed", authMiddleware, async (req, res, next) => {
    await invalidateSimCache();
    req.io = io;
    setSpeed(req, res, next);
  });

  /**
   * @desc Get current user simulation state
   * @route GET /api/simulation
   */
  router.get("/", authMiddleware, async (req, res) => {
    try {
      const latest = await Simulation.findOne({ userId: req.user.id }).sort({ step: -1 });
      if (!latest) {
        return res.status(404).json({ message: "No simulation state found" });
      }
      res.json(latest);
    } catch (err) {
      logger.error(" Error fetching current simulation state: %s", err.message);
      res.status(500).json({ error: "Server error" });
    }
  });

  /**
   * @desc Clear stored simulation history
   * @route DELETE /api/simulation/clear
   */
  router.delete("/clear", authMiddleware, async (req, res) => {
    try {
      const deleted = await Simulation.deleteMany({ userId: req.user.id });
      res.json({ message: "Simulation history cleared", deletedCount: deleted.deletedCount });
    } catch (err) {
      logger.error(" Error clearing simulation history: %s", err.message);
      res.status(500).json({ error: "Server error" });
    }
  });

  /**
   * @desc Get live simulation status
   * @route GET /api/simulation/status
   */
  router.get("/status", authMiddleware, simulationStatusCache, (req, res, next) => {
    req.io = io;
    getSimulationStatus(req, res, next);
  });

  /**
   * @desc Get last 50 simulation logs
   * @route GET /api/simulation/logs
   */
  router.get("/logs", authMiddleware, async (req, res) => {
    try {
      const logs = await Simulation.find({ userId: req.user.id })
        .sort({ step: -1 })
        .limit(50)
        .select("step plants herbivores carnivores events template createdAt");

      res.json(logs);
    } catch (err) {
      logger.error(" Error fetching simulation logs: %s", err.message);
      res.status(500).json({ error: "Server error" });
    }
  });

  /**
   * @desc Get simulation history with optional limit & sort order
   * @route GET /api/simulation/history?limit=100&sort=asc
   */
  router.get("/history", authMiddleware, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 0;
      const sortOrder = req.query.sort === "asc" ? 1 : -1;

      const history = await Simulation.find({ userId: req.user.id })
        .sort({ step: sortOrder })
        .limit(limit)
        .select("step plants herbivores carnivores events template createdAt");

      res.json(history);
    } catch (err) {
      logger.error(" Error fetching simulation history: %s", err.message);
      res.status(500).json({ error: "Server error" });
    }
  });

  /**
   * @desc Generate ecosystem insights dynamically
   * @route GET /api/simulation/insights
   */
  router.get("/insights", authMiddleware, async (req, res) => {
    try {
      const latest = await Simulation.findOne({ userId: req.user.id }).sort({ step: -1 });

      if (!latest) {
        return res.json({ message: "No simulation data found", insights: [] });
      }

      const { plants, herbivores, carnivores } = latest;
      const insights = [];

      if (plants < 20) insights.push(" Plants are critically low, herbivores may starve soon.");
      if (herbivores < 5) insights.push(" Herbivore population near extinction.");
      if (carnivores > herbivores * 2) insights.push(" Too many carnivores compared to herbivores.");
      if (plants > 200 && herbivores > 50) insights.push(" Ecosystem is thriving with healthy balance!");

      const responseData = {
        step: latest.step,
        template: latest.template,
        stats: { plants, herbivores, carnivores },
        insights,
      };

      // Emit insights to the owning user
      io.to(`user-${req.user.id}`).emit("simulation-insights", responseData);

      res.json(responseData);
    } catch (err) {
      logger.error(" Error generating insights: %s", err.message);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Return the configured router
  return router;
};

module.exports = simulationRoutesFactory;
