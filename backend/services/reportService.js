const Simulation = require("../models/Simulation");
const cache = require("../utils/cache");
const AppError = require("../middleware/AppError");

class ReportService {
  async getSummary(limit = 0) {
    const cacheKey = `reports:summary:${limit}`;
    const cachedData = await cache.get(cacheKey);
    if (cachedData) return cachedData;

    const query = {};
    const options = {};
    if (limit > 0) options.limit = limit;

    const data = await Simulation.find(query)
      .sort({ step: 1 })
      .limit(limit > 0 ? limit : 0)
      .lean();

    if (!data.length) {
      const emptyPayload = { data: [], summary: null };
      await cache.set(cacheKey, emptyPayload, 60);
      return emptyPayload;
    }

    const keys = ["plants", "herbivores", "carnivores"];
    const summary = { avg: {}, max: {}, min: {} };

    keys.forEach((key) => {
      const values = data.map((item) => item[key]);
      summary.avg[key] = (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1);
      summary.max[key] = Math.max(...values);
      summary.min[key] = Math.min(...values);
    });

    const responsePayload = { data, summary };
    await cache.set(cacheKey, responsePayload, 60);
    return responsePayload;
  }
}

module.exports = new ReportService();
