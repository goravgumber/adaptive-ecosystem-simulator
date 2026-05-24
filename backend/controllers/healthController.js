const mongoose = require("mongoose");
const config = require("../config/env");
const redisClient = require("../config/redis");
const { getSystemMetrics } = require("./monitoringController");
const { sendSuccess, sendError } = require("../utils/responseFormatter");
const errorCodes = require("../utils/errorCodes");

const checkService = async (url, timeoutMs = 5000) => {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: "GET", signal: controller.signal });
    const latency = Date.now() - start;
    if (!response.ok) {
      return { healthy: false, latency_ms: latency, message: `Returned ${response.status}` };
    }
    return { healthy: true, latency_ms: latency };
  } catch (error) {
    return { healthy: false, latency_ms: Date.now() - start, message: error.message };
  } finally {
    clearTimeout(timeout);
  }
};

const healthCheck = async (req, res, next) => {
  try {
    const mongodbStart = Date.now();
    let mongodbStatus = "disconnected";
    let mongodbLatency = 0;
    if (mongoose.connection.readyState === 1) {
      try {
        await mongoose.connection.db.admin().ping();
        mongodbLatency = Date.now() - mongodbStart;
        mongodbStatus = "connected";
      } catch {
        mongodbStatus = "error";
        mongodbLatency = Date.now() - mongodbStart;
      }
    }

    let redisStatus = "disconnected";
    let redisLatency = 0;
    if (redisClient && redisClient.status === "ready") {
      const redisStart = Date.now();
      try {
        await redisClient.ping();
        redisLatency = Date.now() - redisStart;
        redisStatus = "connected";
      } catch {
        redisStatus = "error";
        redisLatency = Date.now() - redisStart;
      }
    }

    const mlService = await checkService(`${config.ML_SERVICE_URL}/health`);
    const simService = await checkService(
      `${process.env.SIMULATION_SERVICE_URL || "http://localhost:3001"}/health`
    );

    const metrics = await getSystemMetrics();
    const allHealthy = mongodbStatus === "connected" && redisStatus === "connected" && mlService.healthy;
    const overallStatus = allHealthy ? "pass" : "fail";

    const payload = {
      status: overallStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services: {
        mongodb: { status: mongodbStatus, latency_ms: mongodbLatency },
        redis: { status: redisStatus, latency_ms: redisLatency },
        ml_service: mlService,
        simulation_service: simService,
      },
      checks: {
        websocket: { enabled: !!req.app.get("io") },
        memoryUsage: {
          rss: process.memoryUsage().rss,
          heapUsed: process.memoryUsage().heapUsed,
          heapTotal: process.memoryUsage().heapTotal,
        },
      },
      metrics,
    };

    if (overallStatus === "pass") {
      return sendSuccess(res, payload, 200, "Health check passed");
    }
    return sendError(res, "Service health degraded", 503, errorCodes.SERVICE_UNAVAILABLE, payload);
  } catch (error) {
    next(error);
  }
};

const livenessCheck = async (_req, res) => {
  return sendSuccess(res, {
    status: "alive",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }, 200, "Service is alive");
};

const readinessCheck = async (req, res, next) => {
  try {
    const mongodbReady = mongoose.connection.readyState === 1;
    const ioReady = !!req.app.get("io");
    const ready = mongodbReady && ioReady;
    const payload = {
      status: ready ? "ready" : "not_ready",
      checks: { mongodb: mongodbReady, websocket: ioReady },
      timestamp: new Date().toISOString(),
    };
    if (!ready) {
      return sendError(res, "Service is not ready", 503, errorCodes.SERVICE_UNAVAILABLE, payload);
    }
    return sendSuccess(res, payload, 200, "Service is ready");
  } catch (error) {
    next(error);
  }
};

module.exports = { healthCheck, livenessCheck, readinessCheck };