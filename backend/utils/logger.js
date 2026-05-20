const fs = require("fs");
const path = require("path");
const { createLogger, format, transports } = require("winston");
require("winston-daily-rotate-file");

const logDirectory = path.join(__dirname, "../logs");
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

const jsonFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.splat(),
  format.json()
);

const transportFactory = (filename, level) =>
  new transports.DailyRotateFile({
    filename: path.join(logDirectory, `${filename}-%DATE%.log`),
    datePattern: "YYYY-MM-DD",
    zippedArchive: true,
    maxFiles: "14d",
    level,
    handleExceptions: level === "error",
    handleRejections: level === "error",
  });

const logger = createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: jsonFormat,
  transports: [
    new transports.Console({
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
      format: format.combine(format.colorize(), format.simple()),
    }),
    transportFactory("error", "error"),
    transportFactory("combined", "info"),
    transportFactory("access", "info"),
  ],
  exceptionHandlers: [transportFactory("exceptions", "error")],
  rejectionHandlers: [transportFactory("rejections", "error")],
});

logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

module.exports = logger;
