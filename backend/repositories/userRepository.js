const User = require("../models/User");

class UserRepository {
  async findByUsername(username) {
    return User.findOne({ username });
  }

  async findById(id) {
    return User.findById(id);
  }

  async list({ limit = 50, skip = 0 } = {}) {
    return User.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async count() {
    return User.countDocuments();
  }

  async createUser(userData) {
    const user = new User(userData);
    return user.save();
  }

  async updateById(id, update) {
    return User.findByIdAndUpdate(id, update, { new: true }).select("-password");
  }
}

module.exports = new UserRepository();
