const { validationResult } = require("express-validator");

const validate = (rules) => [
  ...rules,
  (req, res, next) => {
    const result = validationResult(req);
    if (result.isEmpty()) {
      return next();
    }

    return res.status(400).json({
      success: false,
      errors: result.array().map((error) => ({
        field: error.path,
        message: error.msg,
      })),
    });
  },
];

module.exports = {
  validate,
};
