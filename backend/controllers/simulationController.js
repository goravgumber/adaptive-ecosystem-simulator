const mongoose = require("mongoose");
const Simulation = require("../models/Simulation");
const logger = require("../config/logger");
const { tickQueue } = require("../queues/simulationQueue");

const userState = new Map();

function getUserState(userId) {
  if (!userState.has(userId)) {
    userState.set(userId, { isRunning: false, speed: 1000 });
  }
  return userState.get(userId);
}

const generateEvents = ({ plants, herbivores, carnivores }) => {
  const events = [];
  if (plants < 20) {
    events.push({ message: "Plants are critically low", severity: "critical" });
  }
  if (herbivores < 5) {
    events.push({ message: "Herbivore population near extinction", severity: "critical" });
  }
  if (carnivores > herbivores * 2) {
    events.push({ message: "Carnivores overpopulated relative to herbivores", severity: "warning" });
  }
  if (plants > 200 && herbivores > 50) {
    events.push({ message: "Ecosystem is thriving with balance", severity: "info" });
  }
  return events;
};

const saveSimulation = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      step = 1, plants = 1000, herbivores = 200, carnivores = 50,
      plant_count, herbivore_count, predator_count,
    } = req.body;

    const p = plant_count ?? plants;
    const h = herbivore_count ?? herbivores;
    const c = predator_count ?? carnivores;

    const events = generateEvents({ plants: p, herbivores: h, carnivores: c });
    const simulation = new Simulation({
      userId, step, plants: p, herbivores: h, carnivores: c, events,
      sessionId: new mongoose.Types.ObjectId(),
    });
    await simulation.save();

    const state = getUserState(userId);
    state.isRunning = true;

    if (req.io) {
      req.io.emit("simulation-update", {
        userId, step, plants, herbivores, carnivores, events,
        isRunning: true, speed: state.speed,
      });
    }

    await tickQueue.add("tick", {
      simulationId: simulation._id,
      sessionId: simulation.sessionId,
      userId,
      currentState: { plants: p, herbivores: h, carnivores: c, step },
      initialPopulations: { plants: p, herbivores: h, carnivores: c },
    }, { delay: state.speed });

    res.status(201).json({ message: "Simulation started", simulation, isRunning: true });
  } catch (err) {
    logger.error("Simulation save error: %s", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

const resetSimulation = async (req, res) => {
  try {
    const userId = req.user.id;
    await Simulation.deleteMany({ userId });
    const state = getUserState(userId);
    state.isRunning = false;
    if (req.io) {
      req.io.emit("simulation-reset", { userId, message: "Simulation has been reset", isRunning: false });
    }
    res.json({ message: "Simulation reset for user", isRunning: false });
  } catch (err) {
    logger.error("Simulation reset error: %s", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

const toggleSimulation = async (req, res) => {
  const userId = req.user.id;
  const state = getUserState(userId);
  state.isRunning = !state.isRunning;
  const responseData = {
    message: state.isRunning ? "Simulation resumed" : "Simulation paused",
    isRunning: state.isRunning,
  };

  if (state.isRunning) {
    try {
      let latest = await Simulation.findOne({ userId }).sort({ step: -1 });
      if (!latest) {
        latest = await Simulation.create({
          userId,
          step: 0,
          plants: 1000,
          herbivores: 200,
          carnivores: 50,
          events: [],
          sessionId: new mongoose.Types.ObjectId(),
        });
      }
      await tickQueue.add("tick", {
        simulationId: latest._id,
        sessionId: latest.sessionId || latest._id,
        userId,
        currentState: {
          plants: latest.plants,
          herbivores: latest.herbivores,
          carnivores: latest.carnivores,
          step: latest.step,
        },
        initialPopulations: null,
      }, { delay: state.speed });
    } catch (err) {
      logger.error("Failed to enqueue resume tick: %s", err.message);
    }
  }

  if (req.io) {
    req.io.emit("simulation-toggle", {
      userId, isRunning: state.isRunning, message: responseData.message, timestamp: new Date().toISOString(),
    });
  }

  res.json(responseData);
};

const setSpeed = (req, res) => {
  const { speed: newSpeed } = req.body;
  if (!newSpeed || newSpeed < 100) {
    return res.status(400).json({ error: "Speed must be >= 100ms" });
  }
  const state = getUserState(req.user.id);
  state.speed = newSpeed;
  if (req.io) {
    req.io.to(`user-${req.user.id}`).emit("simulation-speed", { speed: newSpeed, userId: req.user.id });
  }
  res.json({ message: "Simulation speed updated", speed: newSpeed });
};

const getSimulationStatus = (req, res) => {
  const state = getUserState(req.user.id);
  res.json({ isRunning: state.isRunning, speed: state.speed });
};

module.exports = { saveSimulation, resetSimulation, toggleSimulation, setSpeed, getSimulationStatus };