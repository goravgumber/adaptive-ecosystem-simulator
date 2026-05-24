const sendSuccess = (res, data, statusCode = 200, message = "Success") => {
  const traceId = res.req?.traceId || res.get("x-request-id") || undefined;
  const compatibilityPayload =
    data && !Array.isArray(data) && typeof data === "object" ? data : {};

  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...compatibilityPayload,
    traceId,
  });
};

const sendError = (res, message, statusCode = 500, code = "INTERNAL_ERROR", details = null) => {
  const traceId = res.req?.traceId || res.get("x-request-id") || undefined;
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: message || "An unexpected error occurred",
      details,
    },
    traceId,
  });
};

module.exports = {
  sendSuccess,
  sendError,
};
