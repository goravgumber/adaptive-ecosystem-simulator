const redisClient = require("../config/redis");
const logger = require("./logger");

const blacklistToken = async (token, expirySeconds) => {
  try {
    return await redisClient.blacklistToken(token, expirySeconds);
  } catch (error) {
    logger.error("Failed to blacklist token: %s", error.message);
    return false;
  }
};

const isTokenBlacklisted = async (token) => {
  try {
    return await redisClient.isTokenBlacklisted(token);
  } catch (error) {
    logger.error("Failed to check if token is blacklisted: %s", error.message);
    return false;
  }
};

const storeRefreshToken = async (userId, tokenId, ttlSeconds) => {
  if (!redisClient) return false;
  try {
    await redisClient.set(`refresh:${userId}:${tokenId}`, "active", "EX", ttlSeconds);
    return true;
  } catch (error) {
    logger.error("Failed to store refresh token: %s", error.message);
    return false;
  }
};

const isRefreshTokenActive = async (userId, tokenId) => {
  if (!redisClient) return true;
  try {
    const result = await redisClient.get(`refresh:${userId}:${tokenId}`);
    return result === "active";
  } catch (error) {
    logger.error("Failed to check refresh token: %s", error.message);
    return false;
  }
};

const revokeRefreshToken = async (userId, tokenId) => {
  if (!redisClient) return false;
  try {
    await redisClient.del(`refresh:${userId}:${tokenId}`);
    return true;
  } catch (error) {
    logger.error("Failed to revoke refresh token: %s", error.message);
    return false;
  }
};

const revokeAllRefreshTokens = async (userId) => {
  if (!redisClient) return false;
  try {
    const keys = await redisClient.keys(`refresh:${userId}:*`);
    if (keys.length) await redisClient.del(...keys);
    return true;
  } catch (error) {
    logger.error("Failed to revoke refresh token family: %s", error.message);
    return false;
  }
};

module.exports = {
  blacklistToken,
  isTokenBlacklisted,
  storeRefreshToken,
  isRefreshTokenActive,
  revokeRefreshToken,
  revokeAllRefreshTokens,
};
