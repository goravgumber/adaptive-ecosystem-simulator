const { z } = require("zod");

const signupSchema = z.object({
  body: z.object({
    username: z.string().trim().min(3, "username must be at least 3 characters"),
    password: z.string().min(8, "password must be at least 8 characters"),
  }),
});

const loginSchema = z.object({
  body: z.object({
    username: z.string().trim().min(3, "username must be at least 3 characters"),
    password: z.string().min(8, "password must be at least 8 characters"),
  }),
});

module.exports = {
  signupSchema,
  loginSchema,
};
