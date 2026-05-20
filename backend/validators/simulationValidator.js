const { z } = require("zod");

const createSimulationSchema = z.object({
  body: z.object({
    step: z.coerce.number().int().nonnegative(),
    plants: z.coerce.number().int().nonnegative(),
    herbivores: z.coerce.number().int().nonnegative(),
    carnivores: z.coerce.number().int().nonnegative(),
  }),
});

const speedSchema = z.object({
  body: z.object({
    speed: z.coerce.number().int().min(100),
  }),
});

const historyQuerySchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(0).optional(),
    sort: z.enum(["asc", "desc"]).optional(),
  }),
});

const snapshotQuerySchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(0).optional(),
  }),
});

module.exports = {
  createSimulationSchema,
  speedSchema,
  historyQuerySchema,
  snapshotQuerySchema,
};
