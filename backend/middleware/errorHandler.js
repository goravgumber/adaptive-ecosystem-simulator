const AppError = require("./AppError");
const logger = require("../utils/logger");

const notFoundHandler = (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
};

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const status = err.status || "error";

  const response = {
    status,
    message: err.message || "An unexpected error occurred",
  };

  if (err.details) {
    response.details = err.details;
  }

  if (process.env.NODE_ENV !== "production") {
    response.stack = err.stack;
    response.name = err.name;
  }

  logger.error("%s %s %s %o", req.method, req.originalUrl, err.message, {
    statusCode,
    stack: err.stack,
    details: err.details,
  });

  res.status(statusCode).json(response);
};

module.exports = {
  AppError,
  asyncHandler: require("./asyncHandler"),
  notFoundHandler,
  errorHandler,
};
