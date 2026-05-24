const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis").default;
const redisClient = require("../config/redis");

const createLimiter = (limit, prefix) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      prefix,
      sendCommand: (...args) => redisClient.call(...args),
    }),
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        message: "Too many authentication attempts, please try again later.",
      });
    },
  });

const loginLimiter = createLimiter(10, "rate-limit:login:");
const registerLimiter = createLimiter(5, "rate-limit:register:");

module.exports = {
  loginLimiter,
  registerLimiter,
};
