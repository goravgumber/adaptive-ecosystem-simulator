const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const validateRequest = require("../middleware/validateRequest");
const { createEventSchema, eventQuerySchema } = require("../validators/eventValidator");
const eventService = require("../services/eventService");
const { sendSuccess } = require("../utils/responseFormatter");
const { logEvent } = require("../controllers/monitoringController");
const AppError = require("../middleware/AppError");

const emitEventUpdate = (io, event) => {
  if (!io) return;
  io.emit("event-update", event);
};

router.get("/", authMiddleware, validateRequest(eventQuerySchema), async (req, res) => {
  const { limit = 50, category, severity, resolved, userId } = req.validated.query;

  const query = {};
  if (category && category !== "all") query.category = category;
  if (severity && severity !== "all") query.severity = severity;
  if (resolved !== undefined) query.resolved = resolved === "true";
  if (userId) query.userId = userId;

  const events = await eventService.list(query, limit);
  const eventsWithVirtuals = events.map((event) => ({
    ...event,
    timeAgo: getTimeAgo(event.timestamp),
    severityColor: getSeverityColor(event.severity),
  }));

  return sendSuccess(res, { events: eventsWithVirtuals, count: eventsWithVirtuals.length }, 200, "Events fetched successfully");
});

router.get("/stats", authMiddleware, async (req, res) => {
  const hours = parseInt(req.query.hours, 10) || 24;
  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

  const stats = await eventService.getStats();
  const recentActivity = await Promise.resolve([]); // Event schema might be extended here if needed
  const totalEvents = stats.reduce((sum, bucket) => sum + bucket.total, 0);

  return sendSuccess(
    res,
    {
      stats: {
        total: totalEvents,
        timeRange: `${hours} hours`,
        distribution: stats,
        recentActivity,
      },
    },
    200,
    "Event statistics retrieved successfully"
  );
});

router.get("/category/:category", authMiddleware, async (req, res) => {
  const category = req.params.category;
  const limit = parseInt(req.query.limit, 10) || 20;
  const events = await eventService.getByCategory(category, limit);

  return sendSuccess(res, { category, events, count: events.length }, 200, "Events by category fetched successfully");
});

router.get("/critical", authMiddleware, async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;

  const [criticalEvents, unresolvedEvents] = await Promise.all([
    eventService.getCritical(limit),
    eventService.getUnresolved(20),
  ]);

  return sendSuccess(
    res,
    {
      critical: criticalEvents,
      unresolved: unresolvedEvents,
      counts: {
        critical: criticalEvents.length,
        unresolved: unresolvedEvents.length,
      },
    },
    200,
    "Critical event overview retrieved successfully"
  );
});

router.get("/user/:userId", authMiddleware, async (req, res) => {
  const targetUserId = req.params.userId;
  if (req.user.id !== targetUserId && !req.user.isAdmin) {
    throw new AppError("Access denied", 403);
  }

  const limit = parseInt(req.query.limit, 10) || 50;
  const events = await eventService.getForUser(targetUserId, limit);

  return sendSuccess(
    res,
    { events, userId: targetUserId, count: events.length },
    200,
    "User event history retrieved successfully"
  );
});

router.post("/", authMiddleware, validateRequest(createEventSchema), async (req, res) => {
  const payload = {
    type: req.validated.body.type,
    category: req.validated.body.category,
    message: req.validated.body.message,
    severity: req.validated.body.severity || "info",
    metadata: req.validated.body.metadata || {},
    tags: req.validated.body.tags || [],
    userId: req.user.id,
    timestamp: new Date(),
  };

  const event = await eventService.create(payload);
  emitEventUpdate(req.app.get("io"), event);

  return sendSuccess(
    res,
    {
      event: {
        id: event._id,
        type: event.type,
        category: event.category,
        message: event.message,
        severity: event.severity,
        timestamp: event.timestamp,
      },
    },
    201,
    "Event created successfully"
  );
});

router.patch("/:id/resolve", authMiddleware, async (req, res) => {
  const eventId = req.params.id;
  const event = await eventService.resolve(eventId, req.user.id);
  const io = req.app.get("io");

  await logEvent({
    type: "info",
    category: "system",
    message: `Event resolved: ${event.message}`,
    severity: "info",
    userId: req.user.id,
    metadata: {
      resolvedEventId: eventId,
      originalSeverity: event.severity,
      originalCategory: event.category,
    },
    io,
  });

  emitEventUpdate(io, { eventId, resolvedBy: req.user.id, timestamp: new Date() });

  return sendSuccess(res, { eventId }, 200, "Event marked as resolved successfully");
});

router.patch("/:id/tags", authMiddleware, async (req, res) => {
  const eventId = req.params.id;
  const tags = req.body.tags;
  const event = await eventService.addTags(eventId, tags);

  return sendSuccess(res, { tags: event.tags }, 200, "Tags added successfully");
});

router.delete("/:id", authMiddleware, async (req, res) => {
  if (!req.user.isAdmin) throw new AppError("Admin access required", 403);
  const event = await eventService.delete(req.params.id);

  return sendSuccess(
    res,
    {
      deletedEvent: {
        id: event._id,
        message: event.message,
        timestamp: event.timestamp,
      },
    },
    200,
    "Event deleted successfully"
  );
});

function getTimeAgo(timestamp) {
  const now = new Date();
  const diff = now - new Date(timestamp);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

function getSeverityColor(severity) {
  switch (severity) {
    case "critical":
      return "#DC2626";
    case "warning":
      return "#D97706";
    case "info":
      return "#2563EB";
    default:
      return "#6B7280";
  }
}

module.exports = router;
