const redisClient = require("../config/redis");
const logger = require("./logger");

const set = async (key, value, ttlSeconds = 300) => {
  if (!redisClient) return false;
  try {
    const stringified = JSON.stringify(value);
    await redisClient.set(key, stringified, "EX", ttlSeconds);
    return true;
  } catch (error) {
    logger.warn("Cache SET failed for key %s: %s", key, error.message);
    return false;
  }
};

const get = async (key) => {
  if (!redisClient) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.warn("Cache GET failed for key %s: %s", key, error.message);
    return null;
  }
};

const del = async (key) => {
  if (!redisClient) return false;
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.warn("Cache DEL failed for key %s: %s", key, error.message);
    return false;
  }
};

const delPattern = async (pattern) => {
  if (!redisClient) return false;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
      logger.debug("Invalidated %d cache keys matching pattern %s", keys.length, pattern);
    }
    return true;
  } catch (error) {
    logger.warn("Cache delPattern failed for pattern %s: %s", pattern, error.message);
    return false;
  }
};

module.exports = {
  set,
  get,
  del,
  delPattern,
};
