const { Worker } = require("bullmq");
const redisClient = require("../config/redis");
const logger = require("../utils/logger");
const aiService = require("../services/aiService");
const { monitorPerformance, cleanupOldData } = require("../controllers/monitoringController");
const Simulation = require("../models/Simulation");
const fetch = global.fetch || require("node-fetch");
const config = require("../config/env");

let worker = null;

const startWorkers = (io) => {
  if (!redisClient) {
    logger.warn("Redis is not connected; background workers will not start.");
    return;
  }

  worker = new Worker(
    "background-tasks",
    async (job) => {
      logger.info(`[Worker] Process started for Job ${job.id} (Type: ${job.name})`);

      try {
        switch (job.name) {
          case "ml-training": {
            const { userId, dataLimit = 1000 } = job.data;
            logger.info(`[Worker] ML training initiated for user: ${userId}, max data limit: ${dataLimit}`);

            const recentData = await Simulation.find({ userId })
              .sort({ createdAt: -1 })
              .limit(dataLimit)
              .lean();

            if (recentData.length < 30) {
              throw new Error("Insufficient data points for training model (minimum 30 points required)");
            }

            // Prepare dataset
            const trainingData = [];
            for (let i = 0; i <= recentData.length - 10; i++) {
              const window = recentData.slice(i, i + 5);
              const nextWindow = recentData.slice(i + 5, i + 10);

              if (window.length < 5 || nextWindow.length < 5) continue;

              const plants = window.map((item) => item.plants);
              const herbivores = window.map((item) => item.herbivores);
              const carnivores = window.map((item) => item.carnivores);
              const latest = window[window.length - 1];

              const collapsed = nextWindow.some(n => n.plants < 10 || n.herbivores === 0);

              const features = [
                latest.plants,
                latest.herbivores,
                latest.carnivores,
                calculateTrend(plants),
                calculateTrend(herbivores),
                calculateTrend(carnivores),
                calculateVolatility(plants),
                calculateVolatility(herbivores),
                calculateVolatility(carnivores),
              ];

              trainingData.push({ features, label: collapsed ? 1 : 0 });
            }

            if (trainingData.length === 0) {
              throw new Error("Failed to extract training features: check simulation history size");
            }

            const response = await fetch(`${config.ML_SERVICE_URL}/train/collapse`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ trainingData }),
            });

            if (!response.ok) {
              throw new Error(`ML service training failed: ${response.statusText}`);
            }

            const result = await response.json();
            logger.info(`[Worker] ML training successful: %o`, result);
            return result;
          }

          case "prediction-generation": {
            const { userId, type, steps } = job.data;
            let result;
            if (type === "collapse") {
              result = await aiService.predictCollapse(userId, steps);
              if (io && result.success) {
                io.to(`user-${userId}`).emit("prediction-update", {
                  type: "collapse",
                  prediction: result.prediction,
                });
              }
            } else if (type === "forecast") {
              result = await aiService.forecastPopulations(userId, steps);
              if (io && result.success) {
                io.to(`user-${userId}`).emit("prediction-update", {
                  type: "forecast",
                  forecast: result.forecast,
                });
              }
            }
            return result;
          }

          case "alert-processing": {
            const { metrics, alerts } = await monitorPerformance();
            if (io) {
              io.emit("system-metrics", { metrics, alerts, timestamp: new Date() });
              const criticalAlerts = alerts.filter((alert) => alert.severity === "critical");
              if (criticalAlerts.length > 0) {
                io.emit("critical-alerts", criticalAlerts);
              }
            }
            return { alertCount: alerts.length };
          }

          case "report-generation": {
            const { limit = 0 } = job.data;
            const data = await Simulation.find({}).sort({ step: 1 }).limit(limit).lean();
            if (data.length === 0) return { data: [], summary: null };

            const keys = ["plants", "herbivores", "carnivores"];
            const summary = { avg: {}, max: {}, min: {} };

            keys.forEach((key) => {
              const values = data.map((d) => d[key]);
              summary.avg[key] = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
              summary.max[key] = Math.max(...values);
              summary.min[key] = Math.min(...values);
            });

            const cache = require("../utils/cache");
            const reportData = { data, summary };
            await cache.set("reports:summary", reportData, 600); // 10 minutes cache
            return { dataCount: data.length };
          }

          case "event-cleanup": {
            const result = await cleanupOldData();
            logger.info(`[Worker] Event cleanup complete: %o`, result);
            return result;
          }

          default:
            throw new Error(`Unhandled job type: ${job.name}`);
        }
      } catch (error) {
        logger.error(`[Worker] Job ${job.id} experienced error: %s`, error.message);
        throw error;
      }
    },
    {
      connection: redisClient,
      concurrency: 2,
    }
  );

  worker.on("completed", (job, result) => {
    logger.info(`[Worker] Job ${job.id} (${job.name}) completed successfully`);
  });

  worker.on("failed", (job, err) => {
    logger.error(`[Worker] Job ${job?.id} (${job?.name}) failed: %s`, err.message);
  });
};

const calculateTrend = (values) => {
  if (values.length < 2) return 0;
  return (values[values.length - 1] - values[0]) / (values.length - 1);
};

const calculateVolatility = (values) => {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
};

const stopWorkers = async () => {
  if (!worker) return;
  try {
    await worker.close();
    logger.info("BullMQ worker stopped successfully");
  } catch (error) {
    logger.error("Failed to stop BullMQ worker", error);
  }
};

module.exports = {
  startWorkers,
  stopWorkers,
};
