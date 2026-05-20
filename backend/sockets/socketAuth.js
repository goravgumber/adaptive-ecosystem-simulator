const jwt = require("jsonwebtoken");
const config = require("../config/env");
const logger = require("../utils/logger");

const socketAuth = (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(" ")[1];

  if (!token) {
    logger.warn("Socket connection rejected: no token provided");
    return next(new Error("Authentication error"));
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    socket.user = {
      id: decoded.id,
      username: decoded.username,
      isAdmin: decoded.isAdmin || false,
    };
    socket.join(`user-${socket.user.id}`);
    next();
  } catch (err) {
    logger.warn("Socket authentication failed: %s", err.message);
    next(new Error("Authentication error"));
  }
};

module.exports = socketAuth;
