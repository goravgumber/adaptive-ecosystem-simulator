const { z } = require("zod");

const stepsSchema = z.object({
  body: z.object({
    steps: z.coerce.number().int().min(1).default(5),
  }).partial(),
});

const emptyBodySchema = z.object({
  body: z.object({}).optional(),
});

module.exports = {
  stepsSchema,
  emptyBodySchema,
};
