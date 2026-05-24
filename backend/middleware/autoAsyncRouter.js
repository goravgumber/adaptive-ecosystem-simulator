const express = require("express");
const asyncHandler = require("./asyncHandler");

const wrapHandler = (handler) => {
  if (typeof handler !== "function") {
    return handler;
  }

  // Preserve Express error middleware (4 args)
  if (handler.length === 4) {
    return handler;
  }

  return asyncHandler(handler);
};

const wrapArgs = (args) =>
  args.map((arg) => {
    if (Array.isArray(arg)) {
      return wrapArgs(arg);
    }
    return wrapHandler(arg);
  });

const patchRouter = () => {
  const methods = ["all", "get", "post", "put", "patch", "delete", "options", "head", "use"];
  const Router = express.Router;

  methods.forEach((method) => {
    const original = Router.prototype[method];
    Router.prototype[method] = function (...args) {
      return original.apply(this, wrapArgs(args));
    };
  });
};

patchRouter();

module.exports = {};
