const AppError = require("./AppError");

const validateRequest = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (!result.success) {
    const details = result.error.errors.map((error) => ({
      path: error.path.join("."),
      message: error.message,
    }));
    return next(new AppError("Validation failed", 400, details));
  }

  req.validated = result.data;
  next();
};

module.exports = validateRequest;
