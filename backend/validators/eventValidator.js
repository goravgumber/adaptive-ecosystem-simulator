const { z } = require("zod");

const createEventSchema = z.object({
  body: z.object({
    type: z.string().trim().min(1),
    category: z.string().trim().min(1),
    message: z.string().trim().min(1),
    severity: z.enum(["info", "warning", "critical"]).optional(),
    metadata: z.record(z.any()).optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const eventQuerySchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).optional(),
    category: z.string().trim().optional(),
    severity: z.string().trim().optional(),
    resolved: z.string().trim().optional(),
    userId: z.string().trim().optional(),
  }),
});

module.exports = {
  createEventSchema,
  eventQuerySchema,
};
