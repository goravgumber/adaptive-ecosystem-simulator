const path = require("path");
const dotenv = require("dotenv");
const { z } = require("zod");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  JWT_SECRET: z.string().min(12, "JWT_SECRET must be at least 12 characters"),
  ML_SERVICE_URL: z.string().url("ML_SERVICE_URL must be a valid URL"),
  FRONTEND_URL: z.string().url("FRONTEND_URL must be a valid URL").optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Environment validation failed:");
  parsed.error.errors.forEach((err) => {
    console.error(`- ${err.path.join(".")}: ${err.message}`);
  });
  process.exit(1);
}

module.exports = parsed.data;
