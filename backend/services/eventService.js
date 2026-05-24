const eventRepository = require("../repositories/eventRepository");
const AppError = require("../middleware/AppError");

class EventService {
  async list(query = {}, limit = 50) {
    return eventRepository.list(query, limit);
  }

  async getStats() {
    return eventRepository.getStats();
  }

  async getByCategory(category, limit = 20) {
    return eventRepository.getByCategory(category, limit);
  }

  async getCritical(limit = 10) {
    return eventRepository.getCritical(limit);
  }

  async getUnresolved(limit = 20) {
    return eventRepository.getUnresolved(limit);
  }

  async getForUser(userId, limit = 50) {
    return eventRepository.getForUser(userId, limit);
  }

  async create(payload) {
    if (!payload.type || !payload.category || !payload.message) {
      throw new AppError("Missing required event fields", 400, { required: ["type", "category", "message"] });
    }
    return eventRepository.create(payload);
  }

  async resolve(eventId, userId) {
    const event = await eventRepository.findById(eventId);
    if (!event) {
      throw new AppError("Event not found", 404);
    }
    if (event.resolved) {
      throw new AppError("Event already resolved", 400);
    }
    await event.resolve(userId);
    return event;
  }

  async addTags(eventId, tags) {
    if (!tags || !Array.isArray(tags)) {
      throw new AppError("Tags must be an array", 400);
    }
    const event = await eventRepository.findById(eventId);
    if (!event) {
      throw new AppError("Event not found", 404);
    }
    await event.addTags(tags);
    return event;
  }

  async delete(eventId) {
    const event = await eventRepository.deleteById(eventId);
    if (!event) {
      throw new AppError("Event not found", 404);
    }
    return event;
  }
}

module.exports = new EventService();
