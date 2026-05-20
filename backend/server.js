const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xssClean = require("xss-clean");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const http = require("http");
const { Server } = require("socket.io");
const swaggerUi = require("swagger-ui-express");

const config = require("./config/env");
const logger = require("./utils/logger");
const socketAuth = require("./sockets/socketAuth");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth");
const simulationRoutesFactory = require("./routes/simulation");
const dashboardRoutes = require("./routes/dashboard");
const logRoutes = require("./routes/logs");
const reportsRoutes = require("./routes/reports");
const monitorRoutes = require("./routes/monitor");
const alertsRoutesFactory = require("./routes/alerts");
const metricsRoutes = require("./routes/metrics");
const eventsRoutes = require("./routes/events");
const predictionsRoutes = require("./routes/Predictions");
const healthRoutes = require("./routes/health");
const swaggerSpec = require("./docs/swaggerSpec");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.NODE_ENV === "production" ? config.FRONTEND_URL : true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
});

app.disable("x-powered-by");

const apiLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "fail",
    message: "Too many requests from this IP, please try again later.",
  },
});

app.use(apiLimiter);
app.use(helmet());
app.use(cors({ origin: config.NODE_ENV === "production" ? config.FRONTEND_URL : true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(mongoSanitize());
app.use(xssClean());
app.use(compression());
app.use(morgan("combined", { stream: logger.stream }));

app.set("io", io);
io.use(socketAuth);

const initializeAIService = async () => {
  try {
    const aiService = require("./services/aiService");
    const initialized = await aiService.initialize();
    if (initialized) {
      logger.info("AI Service initialized successfully");
    } else {
      logger.warn("AI Service initialization failed; fallback predictions will be used");
    }
  } catch (error) {
    logger.error("AI Service initialization error", error);
  }
};

const startBackgroundMonitoring = () => {
  const { monitorPerformance, cleanupOldData } = require("./controllers/monitoringController");

  setInterval(async () => {
    try {
      const { metrics, alerts } = await monitorPerformance();
      io.emit("system-metrics", { metrics, alerts, timestamp: new Date() });
      const criticalAlerts = alerts.filter((alert) => alert.severity === "critical");
      if (criticalAlerts.length > 0) {
        io.emit("critical-alerts", criticalAlerts);
      }
    } catch (error) {
      logger.error("Background monitoring error", error);
    }
  }, 60 * 1000);

  setInterval(async () => {
    try {
      const cleanupResult = await cleanupOldData();
      logger.info("Data cleanup completed", cleanupResult);
    } catch (error) {
      logger.error("Data cleanup error", error);
    }
  }, 6 * 60 * 60 * 1000);

  setInterval(async () => {
    try {
      logger.info("Scheduled AI retraining evaluation started");
      const Simulation = require("./models/Simulation");
      const recentData = await Simulation.find().sort({ createdAt: -1 }).limit(1000).lean();
      if (recentData.length >= 100) {
        logger.info("AI retraining data ready", { records: recentData.length });
      }
    } catch (error) {
      logger.error("AI retraining error", error);
    }
  }, 24 * 60 * 60 * 1000);
};

const configureRoutes = () => {
  app.use("/api/auth", authRoutes);
  app.use("/api/simulation", simulationRoutesFactory(io));
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/logs", logRoutes);
  app.use("/api/reports", reportsRoutes);
  app.use("/api/monitor", monitorRoutes);
  app.use("/api/alerts", alertsRoutesFactory(io));
  app.use("/api/metrics", metricsRoutes);
  app.use("/api/events", eventsRoutes);
  app.use("/api/predictions", predictionsRoutes);
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
  app.use("/health", healthRoutes);

  app.get("/", (req, res) => {
    res.json({
      status: "OK",
      service: "Adaptive Ecosystem Simulator Backend",
      version: "3.0.0",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);
};

const startServer = async () => {
  try {
    await mongoose.connect(config.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    logger.info("MongoDB connected");
    await initializeAIService();
    startBackgroundMonitoring();
    configureRoutes();

    io.on("connection", (socket) => {
      logger.info("Socket connected", { socketId: socket.id, userId: socket.user?.id });
      socket.emit("connection-success", { socketId: socket.id, userId: socket.user?.id });

      socket.on("request-metrics", async () => {
        try {
          const { getSystemMetrics } = require("./controllers/monitoringController");
          const metrics = await getSystemMetrics();
          socket.emit("metrics-update", metrics);
        } catch (error) {
          socket.emit("metrics-error", { message: error.message });
        }
      });

      socket.on("disconnect", (reason) => {
        logger.info("Socket disconnected", { socketId: socket.id, reason });
      });
    });

    const port = config.PORT;
    server.listen(port, () => {
      logger.info("Server started", { port, nodeEnv: config.NODE_ENV });
    });
  } catch (error) {
    logger.error("Server startup failed", error);
    process.exit(1);
  }
};

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection detected", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception detected", error);
  process.exit(1);
});

startServer();

module.exports = { app, server, io };