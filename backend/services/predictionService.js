const aiService = require("./aiService");
const predictionRepository = require("../repositories/predictionRepository");
const AppError = require("../middleware/AppError");

class PredictionService {
  async predictCollapse(userId, steps) {
    const result = await aiService.predictCollapse(userId, steps);
    if (!result.success) {
      throw new AppError(result.error || "Prediction service failed", 502, { source: "aiService" });
    }

    const prediction = await predictionRepository.create({
      userId,
      type: "collapse",
      input: { steps },
      output: result.prediction,
      confidence: result.prediction?.confidence || 0,
      stepsAhead: steps,
      metadata: {
        modelVersion: result.modelVersion || "unknown",
        processingTime: result.processingTime || null,
      },
    });

    return { prediction, result };
  }

  async forecastPopulations(userId, steps) {
    const result = await aiService.forecastPopulations(userId, steps);
    if (!result.success) {
      throw new AppError(result.error || "Forecast service failed", 502, { source: "aiService" });
    }

    const prediction = await predictionRepository.create({
      userId,
      type: "forecast",
      input: { steps },
      output: result.forecast,
      confidence: result.forecast?.confidence || 0,
      stepsAhead: steps,
      metadata: {
        modelVersion: result.modelVersion || "unknown",
        processingTime: result.processingTime || null,
      },
    });

    return { prediction, result };
  }

  async generateRecommendations(userId) {
    const result = await aiService.generateRecommendations(userId);
    if (!result.success) {
      throw new AppError(result.error || "Recommendation generation failed", 502, { source: "aiService" });
    }

    const prediction = await predictionRepository.create({
      userId,
      type: "recommendations",
      input: {},
      output: { recommendations: result.recommendations, reasoning: result.reasoning },
      confidence: result.confidence || 0,
      stepsAhead: 0,
      metadata: {
        modelVersion: result.modelVersion || "unknown",
        processingTime: result.processingTime || null,
      },
    });

    return { prediction, result };
  }

  async detectPatterns(userId) {
    const result = await aiService.detectPatterns(userId);
    if (!result.success) {
      throw new AppError(result.error || "Pattern detection failed", 502, { source: "aiService" });
    }

    const prediction = await predictionRepository.create({
      userId,
      type: "patterns",
      input: {},
      output: result.patterns,
      confidence: result.patterns?.confidence || 0,
      stepsAhead: 0,
      metadata: {
        modelVersion: result.modelVersion || "unknown",
        processingTime: result.processingTime || null,
      },
    });

    return { prediction, result };
  }

  async listPredictions(userId, query) {
    const filter = {};
    if (query.type && query.type !== "all") filter.type = query.type;
    if (query.accuracy) filter.accuracy = { $exists: true };
    return predictionRepository.listByUser(userId, filter, query.limit);
  }

  async getPredictionStats(userId, type) {
    return predictionRepository.getStats(userId, type);
  }

  async getTrendingPredictions(limit = 5) {
    return predictionRepository.getTrending(limit);
  }
}

module.exports = new PredictionService();
