const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const validateRequest = require("../middleware/validateRequest");
const { stepsSchema, emptyBodySchema } = require("../validators/predictionValidator");
const predictionService = require("../services/predictionService");
const { sendSuccess } = require("../utils/responseFormatter");
const { logEvent } = require("../controllers/monitoringController");
const Prediction = require("../models/Prediction");
const { addJob } = require("../queues");
const AppError = require("../middleware/AppError");

const emitPredictionUpdate = (io, userId, payload) => {
  if (!io) return;
  io.to(`user-${userId}`).emit("prediction-update", payload);
};

const buildPredictionSummary = (prediction) => ({
  id: prediction._id,
  type: prediction.type,
  confidence: Math.round((prediction.confidence || 0) * 100),
  ageInHours: prediction.timestamp ? Math.floor((new Date() - prediction.timestamp) / (1000 * 60 * 60)) : 0,
  accuracy: prediction.accuracy !== undefined ? Math.round(prediction.accuracy * 100) : null,
});

router.post(
  "/collapse",
  authMiddleware,
  validateRequest(stepsSchema),
  async (req, res) => {
    const userId = req.user.id;
    const { steps = 5 } = req.validated.body;
    const io = req.app.get("io");

    const { result } = await predictionService.predictCollapse(userId, steps);

    emitPredictionUpdate(io, userId, { type: "collapse", prediction: result.prediction });

    await logEvent({
      type: "prediction",
      category: "ecosystem",
      message: `Collapse prediction generated: ${result.prediction.riskLevel} risk (${Math.round((result.prediction.collapseRisk || 0) * 100)}%)`,
      severity: result.prediction.riskLevel === "critical" ? "critical" : "info",
      userId,
      metadata: {
        predictionType: "collapse",
        riskLevel: result.prediction.riskLevel,
        confidence: result.prediction.confidence,
        stepsAhead: steps,
      },
      io,
    });

    return sendSuccess(res, { prediction: result.prediction }, 200, "Collapse prediction generated successfully");
  }
);

router.post(
  "/forecast",
  authMiddleware,
  validateRequest(stepsSchema),
  async (req, res) => {
    const userId = req.user.id;
    const { steps = 7 } = req.validated.body;
    const io = req.app.get("io");

    const { result } = await predictionService.forecastPopulations(userId, steps);

    emitPredictionUpdate(io, userId, { type: "forecast", forecast: result.forecast });

    await logEvent({
      type: "prediction",
      category: "ecosystem",
      message: `Population forecast generated for ${steps} steps ahead (confidence: ${Math.round((result.forecast.confidence || 0) * 100)}%)`,
      severity: "info",
      userId,
      metadata: {
        predictionType: "forecast",
        stepsAhead: steps,
        confidence: result.forecast.confidence,
      },
      io,
    });

    return sendSuccess(res, { forecast: result.forecast }, 200, "Population forecast generated successfully");
  }
);

router.post(
  "/recommendations",
  authMiddleware,
  validateRequest(emptyBodySchema),
  async (req, res) => {
    const userId = req.user.id;
    const io = req.app.get("io");

    const { result } = await predictionService.generateRecommendations(userId);

    emitPredictionUpdate(io, userId, {
      type: "recommendations",
      recommendations: result.recommendations,
      reasoning: result.reasoning,
    });

    await logEvent({
      type: "prediction",
      category: "ecosystem",
      message: `Smart recommendations generated: ${result.recommendations.length} actions suggested`,
      severity: "info",
      userId,
      metadata: {
        predictionType: "recommendations",
        actionCount: result.recommendations.length,
        confidence: result.confidence,
      },
      io,
    });

    return sendSuccess(
      res,
      {
        recommendations: result.recommendations,
        reasoning: result.reasoning,
        confidence: result.confidence,
      },
      200,
      "Smart recommendations generated successfully"
    );
  }
);

router.post(
  "/patterns",
  authMiddleware,
  validateRequest(emptyBodySchema),
  async (req, res) => {
    const userId = req.user.id;
    const io = req.app.get("io");

    const { result } = await predictionService.detectPatterns(userId);

    await logEvent({
      type: "prediction",
      category: "ecosystem",
      message: `Ecosystem patterns analyzed: Health score ${Math.round((result.patterns.healthScore || 0) * 100)}%`,
      severity: "info",
      userId,
      metadata: {
        predictionType: "patterns",
        healthScore: result.patterns.healthScore,
        stability: result.patterns.stability,
      },
      io,
    });

    return sendSuccess(res, { patterns: result.patterns }, 200, "Ecosystem patterns detected successfully");
  }
);

router.get("/", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { type, limit = 20, accuracy } = req.query;

  const predictions = await predictionService.listPredictions(userId, { type, accuracy, limit });

  const predictionsWithVirtuals = predictions.map((prediction) => ({
    ...prediction,
    summary: buildPredictionSummary(prediction),
  }));

  return sendSuccess(
    res,
    {
      predictions: predictionsWithVirtuals,
      count: predictionsWithVirtuals.length,
      filters: { type, limit, accuracy },
    },
    200,
    "Predictions retrieved successfully"
  );
});

router.get("/stats", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { days = 30 } = req.query;
  const parsedDays = parseInt(days, 10) || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parsedDays);

  const totalPredictions = await Prediction.countDocuments({
    userId,
    timestamp: { $gte: startDate },
  });

  const highConfidencePredictions = await Prediction.countDocuments({
    userId,
    timestamp: { $gte: startDate },
    confidence: { $gte: 0.8 },
  });

  const accuracyStats = await Promise.all([
    Prediction.getAccuracyStats(userId, "collapse"),
    Prediction.getAccuracyStats(userId, "forecast"),
    Prediction.getAccuracyStats(userId, "recommendations"),
  ]);

  const confidenceDistribution = await Prediction.getConfidenceDistribution(userId, parsedDays);

  const predictionsByType = await Prediction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
        averageConfidence: { $avg: "$confidence" },
        latestPrediction: { $max: "$timestamp" },
      },
    },
  ]);

  return sendSuccess(
    res,
    {
      stats: {
        summary: {
          totalPredictions,
          highConfidencePredictions,
          accuracyRate:
            accuracyStats.length > 0
              ? accuracyStats.reduce((sum, stat) => sum + (stat.averageAccuracy || 0), 0) / accuracyStats.length
              : 0,
          timeRange: `${parsedDays} days`,
        },
        byType: {
          collapse: accuracyStats[0],
          forecast: accuracyStats[1],
          recommendations: accuracyStats[2],
        },
        distribution: {
          confidence: confidenceDistribution,
          types: predictionsByType,
        },
      },
    },
    200,
    "Prediction statistics retrieved successfully"
  );
});

router.get("/latest/:type", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { type } = req.params;
  const limit = parseInt(req.query.limit, 10) || 5;

  const predictions = await Prediction.getLatestByType(userId, type, limit);

  return sendSuccess(
    res,
    { predictions, type, count: predictions.length },
    200,
    `Latest ${type} predictions retrieved successfully`
  );
});

router.put("/:id/evaluate", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { actualOutcome } = req.body;

  const prediction = await Prediction.findOne({ _id: id, userId: req.user.id });
  if (!prediction) throw new AppError("Prediction not found", 404);
  if (prediction.accuracy !== undefined) throw new AppError("Prediction has already been evaluated", 400);

  await prediction.evaluateAccuracy(actualOutcome);
  const io = req.app.get("io");

  await logEvent({
    type: "info",
    category: "ecosystem",
    message: `Prediction evaluated: ${Math.round((prediction.accuracy || 0) * 100)}% accuracy`,
    severity: "info",
    userId: req.user.id,
    metadata: {
      predictionId: id,
      predictionType: prediction.type,
      accuracy: prediction.accuracy,
    },
    io,
  });

  return sendSuccess(
    res,
    {
      prediction: {
        id: prediction._id,
        type: prediction.type,
        accuracy: Math.round((prediction.accuracy || 0) * 100),
        evaluatedAt: prediction.evaluatedAt,
      },
    },
    200,
    "Prediction accuracy evaluated successfully"
  );
});

router.post("/train", authMiddleware, async (req, res) => {
  if (!req.user.isAdmin) throw new AppError("Admin access required", 403);

  const { modelType = "all", dataLimit = 1000 } = req.body;
  const io = req.app.get("io");

  const job = await addJob("background-tasks", "ml-training", {
    userId: req.user.id,
    modelType,
    dataLimit,
  });

  await logEvent({
    type: "info",
    category: "system",
    message: `AI model training queued in background: ${modelType} (Job ID: ${job?.id})`,
    severity: "info",
    userId: req.user.id,
    metadata: {
      modelType,
      dataLimit,
      initiatedBy: req.user.id,
      jobId: job?.id,
    },
    io,
  });

  return sendSuccess(
    res,
    {
      training: {
        jobId: job?.id,
        estimatedTime: "2-5 minutes",
        dataPoints: dataLimit,
      },
    },
    202,
    "Model training initiated successfully"
  );
});

module.exports = router;
