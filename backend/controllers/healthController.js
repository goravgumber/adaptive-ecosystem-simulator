const mongoose = require("mongoose");
const config = require("../config/env");
const { getSystemMetrics } = require("./monitoringController");
const { sendSuccess, sendError } = require("../utils/responseFormatter");
const errorCodes = require("../utils/errorCodes");

const checkMlService = async () => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${config.ML_SERVICE_URL}/health`, {
      method: "GET",
      signal: controller.signal,
    });

    if (!response.ok) {
      return { healthy: false, status: response.status, message: "ML service returned non-200" };
    }

    const payload = await response.json();
    return { healthy: true, info: payload };
  } catch (error) {
    return { healthy: false, message: error.message };
  } finally {
    clearTimeout(timeout);
  }
};

const healthCheck = async (req, res, next) => {
  try {
    const mongodbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    const metrics = await getSystemMetrics();
    const mlService = await checkMlService();

    const status =
      mongodbStatus === "connected" && mlService.healthy ? "pass" : "fail";

    const payload = {
      status,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks: {
        mongodb: {
          status: mongodbStatus,
          readyState: mongoose.connection.readyState,
        },
        mlService,
        memoryUsage: {
          rss: process.memoryUsage().rss,
          heapUsed: process.memoryUsage().heapUsed,
          heapTotal: process.memoryUsage().heapTotal,
        },
        eventLoopLagMs: Date.now() - performance.now(),
        websocket: {
          enabled: !!req.app.get("io"),
        },
      },
      metrics,
    };

    if (status === "pass") {
      return sendSuccess(res, payload, 200, "Health check passed");
    }

    return sendError(res, "Service health degraded", 503, errorCodes.SERVICE_UNAVAILABLE, payload);
  } catch (error) {
    next(error);
  }
};

const livenessCheck = async (_req, res) => {
  return sendSuccess(
    res,
    {
      status: "alive",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
    200,
    "Service is alive"
  );
};

const readinessCheck = async (req, res, next) => {
  try {
    const mongodbReady = mongoose.connection.readyState === 1;
    const ioReady = !!req.app.get("io");
    const ready = mongodbReady && ioReady;

    const payload = {
      status: ready ? "ready" : "not_ready",
      checks: {
        mongodb: mongodbReady,
        websocket: ioReady,
      },
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

module.exports = {
  healthCheck,
  livenessCheck,
  readinessCheck,
};
