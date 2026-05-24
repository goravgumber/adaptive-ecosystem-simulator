const redisClient = require("../config/redis");
const logger = require("../utils/logger");

const STATUS_CACHE_KEY = "sim:status";
const STATUS_CACHE_TTL_SECONDS = 5;

const simulationStatusCache = async (_req, res, next) => {
  try {
    const cached = await redisClient.get(STATUS_CACHE_KEY);
    if (cached) {
      return res.json(JSON.parse(cached));
    }
  } catch (error) {
    logger.warn("Simulation cache read failed: %s", error.message);
  }

  const sendJson = res.json.bind(res);
  res.json = (payload) => {
    redisClient
      .set(STATUS_CACHE_KEY, JSON.stringify(payload), "EX", STATUS_CACHE_TTL_SECONDS)
      .catch((error) => logger.warn("Simulation cache write failed: %s", error.message));
    return sendJson(payload);
  };

  return next();
};

const invalidateSimCache = async () => {
  try {
    await redisClient.del(STATUS_CACHE_KEY);
  } catch (error) {
    logger.warn("Simulation cache invalidation failed: %s", error.message);
  }
};

module.exports = {
  simulationStatusCache,
  invalidateSimCache,
};
