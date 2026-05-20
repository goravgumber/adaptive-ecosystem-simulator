const swaggerDocument = {
  openapi: "3.0.1",
  info: {
    title: "Adaptive Ecosystem Simulator API",
    version: "1.0.0",
    description: "Production-ready backend API for the Adaptive Ecosystem Simulator.",
  },
  servers: [
    {
      url: "http://localhost:5000",
      description: "Local development server",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      AuthRequest: {
        type: "object",
        properties: {
          username: { type: "string", example: "ecosystem_admin" },
          password: { type: "string", example: "StrongPassword123" },
        },
        required: ["username", "password"],
      },
      AuthResponse: {
        type: "object",
        properties: {
          token: { type: "string" },
          user: {
            type: "object",
            properties: {
              id: { type: "string" },
              username: { type: "string" },
              isAdmin: { type: "boolean" },
            },
          },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          status: { type: "string" },
          message: { type: "string" },
          details: { type: "array", items: { type: "object" } },
        },
      },
    },
  },
  security: [{ BearerAuth: [] }],
  paths: {
    "/api/auth/signup": {
      post: {
        tags: ["Authentication"],
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthRequest" },
            },
          },
        },
        responses: {
          201: { description: "User created successfully" },
          400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Authenticate a user and issue a JWT",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthRequest" },
            },
          },
        },
        responses: {
          200: { description: "Authentication success", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } } },
          401: { description: "Invalid credentials" },
        },
      },
    },
    "/api/auth/validate": {
      get: {
        tags: ["Authentication"],
        security: [{ BearerAuth: [] }],
        summary: "Validate the current JWT",
        responses: {
          200: { description: "Token valid" },
          401: { description: "Invalid or expired token" },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Authentication"],
        security: [{ BearerAuth: [] }],
        summary: "Get the authenticated user's profile",
        responses: {
          200: { description: "User profile returned" },
          401: { description: "Not authenticated" },
        },
      },
    },
    "/api/simulation": {
      get: {
        tags: ["Simulation"],
        security: [{ BearerAuth: [] }],
        summary: "Fetch authenticated user's simulation history",
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer" }, required: false },
        ],
        responses: {
          200: { description: "Simulation history returned" },
        },
      },
      post: {
        tags: ["Simulation"],
        security: [{ BearerAuth: [] }],
        summary: "Record a simulation step",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  step: { type: "integer" },
                  plants: { type: "integer" },
                  herbivores: { type: "integer" },
                  carnivores: { type: "integer" },
                },
                required: ["step", "plants", "herbivores", "carnivores"],
              },
            },
          },
        },
        responses: {
          201: { description: "Simulation step saved" },
        },
      },
      delete: {
        tags: ["Simulation"],
        security: [{ BearerAuth: [] }],
        summary: "Clear authenticated user's simulation history",
        description: "Deletes all saved simulation records for the current user.",
        responses: {
          200: { description: "Simulation history cleared" },
        },
      },
    },
    "/api/reports/summary": {
      get: {
        tags: ["Reports"],
        security: [{ BearerAuth: [] }],
        summary: "Return a report summary for the current user",
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer" }, required: false },
        ],
        responses: {
          200: { description: "Report summary returned" },
        },
      },
    },
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Return health metrics for the backend and ML service",
        responses: {
          200: { description: "Healthy" },
          503: { description: "Unhealthy" },
        },
      },
    },
  },
};

module.exports = swaggerDocument;
