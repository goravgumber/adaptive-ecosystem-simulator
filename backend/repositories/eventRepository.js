const Event = require("../models/Event");

class EventRepository {
  async list(query = {}, limit = 50) {
    return Event.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit, 10) || 50)
      .lean();
  }

  async getStats() {
    return Event.getStats();
  }

  async getByCategory(category, limit = 20) {
    return Event.getByCategory(category, limit);
  }

  async getCritical(limit = 10) {
    return Event.getCritical(limit);
  }

  async getUnresolved(limit = 20) {
    return Event.getUnresolved(limit);
  }

  async getForUser(userId, limit = 50) {
    return Event.getForUser(userId, limit);
  }

  async findById(id) {
    return Event.findById(id);
  }

  async create(payload) {
    const event = new Event(payload);
    return event.save();
  }

  async deleteById(id) {
    return Event.findByIdAndDelete(id);
  }
}

module.exports = new EventRepository();
