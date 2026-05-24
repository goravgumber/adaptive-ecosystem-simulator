const Prediction = require("../models/Prediction");

class PredictionRepository {
  async create(payload) {
    return Prediction.create(payload);
  }

  async listByUser(userId, filter = {}, limit = 20) {
    const query = { userId, ...filter };
    return Prediction.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit, 10) || 20)
      .lean();
  }

  async getLatestByType(userId, type, limit = 10) {
    return Prediction.getLatestByType(userId, type, limit);
  }

  async getStats(userId, type) {
    return Prediction.getAccuracyStats(userId, type);
  }

  async getConfidenceDistribution(userId, days) {
    return Prediction.getConfidenceDistribution(userId, days);
  }

  async getTrending(limit = 5) {
    return Prediction.getTrendingPredictions(limit);
  }

  async findById(id) {
    return Prediction.findById(id);
  }
}

module.exports = new PredictionRepository();
