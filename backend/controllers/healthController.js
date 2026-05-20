const mongoose = require("mongoose");
const config = require("../config/env");
const { getSystemMetrics } = require("./monitoringController");

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

    res.status(status === "pass" ? 200 : 503).json({
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
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  healthCheck,
};
