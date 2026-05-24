const fs = require("fs");
const path = require("path");
const winston = require("winston");

const isProduction = process.env.NODE_ENV === "production";
const logDirectory = path.resolve(__dirname, "../logs");

if (isProduction && !fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

const timestamp = winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" });
const logger = winston.createLogger({
  level: isProduction ? "info" : "debug",
  format: isProduction
    ? winston.format.combine(timestamp, winston.format.errors({ stack: true }), winston.format.splat(), winston.format.json())
    : winston.format.combine(
        timestamp,
        winston.format.colorize(),
        winston.format.splat(),
        winston.format.printf(({ level, message, timestamp: at }) => `[${at}] ${level}: ${message}`)
      ),
  transports: isProduction
    ? [
        new winston.transports.File({ filename: path.join(logDirectory, "combined.log") }),
        new winston.transports.File({ filename: path.join(logDirectory, "error.log"), level: "error" }),
      ]
    : [new winston.transports.Console()],
});

logger.stream = {
  write: (message) => logger.info(message.trim()),
};

module.exports = logger;
