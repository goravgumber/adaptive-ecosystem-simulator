const logger = require("../config/logger");

const requestLogger = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
    logger.info(
      `[${timestamp}] ${req.method} ${req.originalUrl} ${res.statusCode} ${Math.round(durationMs)}ms`
    );
  });

  next();
};

module.exports = requestLogger;
