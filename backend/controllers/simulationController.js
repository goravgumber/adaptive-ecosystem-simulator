const Simulation = require("../models/Simulation");
const logger = require("../config/logger");

let isRunning = true;
let speed = 1000;

const generateEvents = ({ plants, herbivores, carnivores }) => {
  const events = [];

  if (plants < 20) {
    events.push({ message: " Plants are critically low", severity: "critical" });
  }
  if (herbivores < 5) {
    events.push({ message: " Herbivore population near extinction", severity: "critical" });
  }
  if (carnivores > herbivores * 2) {
    events.push({ message: " Carnivores overpopulated relative to herbivores", severity: "warning" });
  }
  if (plants > 200 && herbivores > 50) {
    events.push({ message: " Ecosystem is thriving with balance", severity: "info" });
  }

  const randomEvents = [
    { message: "New plant growth detected ", severity: "info" },
    { message: "Herbivore consumed a plant ", severity: "info" },
    { message: "Carnivore hunted a herbivore ", severity: "warning" },
    { message: "Population stabilized ", severity: "info" },
    { message: "Carnivore spotted in territory ", severity: "info" },
  ];
  events.push(randomEvents[Math.floor(Math.random() * randomEvents.length)]);

  return events;
};

const saveSimulation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { step, plants, herbivores, carnivores } = req.body;

    if (!isRunning) {
      return res.status(403).json({ message: "Simulation is paused" });
    }

    const events = generateEvents({ plants, herbivores, carnivores });
    const template = step % 2 === 0 ? "day" : "night";

    const simulation = new Simulation({
      userId,
      step,
      plants,
      herbivores,
      carnivores,
      events,
      template,
    });

    await simulation.save();

    // Emit real-time update if Socket.IO is available
    if (req.io) {
      req.io.emit("simulation-update", {
        userId,
        step,
        plants,
        herbivores,
        carnivores,
        events,
        template,
        isRunning,
        speed
      });
    }

    res.status(201).json({ message: " Simulation step saved", simulation });
  } catch (err) {
    logger.error(" Simulation save error: %s", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

const resetSimulation = async (req, res) => {
  try {
    const userId = req.user.id;
    await Simulation.deleteMany({ userId });
    isRunning = false;

    // Emit reset event if Socket.IO is available
    if (req.io) {
      req.io.emit("simulation-reset", {
        userId,
        message: "Simulation has been reset",
        isRunning: false
      });
    }

    res.json({ message: "Simulation reset for user", isRunning });
  } catch (err) {
    logger.error(" Simulation reset error: %s", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

const toggleSimulation = (req, res) => {
  isRunning = !isRunning;

  const responseData = {
    message: isRunning ? " Simulation resumed" : " Simulation paused",
    isRunning,
  };

  // Emit toggle event if Socket.IO is available
  if (req.io) {
    req.io.emit("simulation-toggle", {
      isRunning,
      message: responseData.message,
      timestamp: new Date().toISOString()
    });
  }

  res.json(responseData);
};

const setSpeed = (req, res) => {
  // Fixed: Changed from newSpeed to speed to match frontend
  const { speed: newSpeed } = req.body;

  if (!newSpeed || newSpeed < 100) {
    return res.status(400).json({ error: "Speed must be >= 100ms" });
  }

  speed = newSpeed;

  const responseData = { message: " Simulation speed updated", speed };

  // Emit speed change event if Socket.IO is available
  if (req.io) {
    req.io.emit("simulation-speed-change", {
      speed,
      message: responseData.message,
      timestamp: new Date().toISOString()
    });
  }

  res.json(responseData);
};

const getSimulationStatus = (req, res) => {
  const statusData = { isRunning, speed };

  // Optionally emit status request if Socket.IO is available
  if (req.io) {
    req.io.emit("simulation-status-request", {
      ...statusData,
      timestamp: new Date().toISOString()
    });
  }

  res.json(statusData);
};

module.exports = {
  saveSimulation,
  resetSimulation,
  toggleSimulation,
  setSpeed,
  getSimulationStatus,
};
