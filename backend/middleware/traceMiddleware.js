const crypto = require("crypto");

const traceMiddleware = (req, res, next) => {
  const traceId = req.headers["x-request-id"] || crypto.randomUUID();
  req.traceId = traceId;
  res.setHeader("x-request-id", traceId);
  next();
};

module.exports = traceMiddleware;
