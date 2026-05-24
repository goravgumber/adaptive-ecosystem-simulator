const Redis = require("ioredis");
const config = require("./env");
const logger = require("../utils/logger");

const redisUrl = process.env.REDIS_URL || config.REDIS_URL;
const redisClient = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // Required by BullMQ
});

redisClient.on("ready", () => {
  logger.info("Redis connected");
});

redisClient.on("error", (error) => {
  logger.error("Redis error: %s", error.message);
});

redisClient.blacklistToken = async (token, ttlSeconds) => {
  if (!token || ttlSeconds <= 0) return false;
  await redisClient.set(`blacklist:${token}`, "true", "EX", ttlSeconds);
  return true;
};

redisClient.isTokenBlacklisted = async (token) => {
  if (!token) return false;
  return (await redisClient.get(`blacklist:${token}`)) === "true";
};

module.exports = redisClient;
