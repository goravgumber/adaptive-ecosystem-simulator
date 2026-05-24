const mongoose = require("mongoose");

const logSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId },
  simulationId: { type: mongoose.Schema.Types.ObjectId },
  tick: { type: Number },
  level: { type: String, enum: ["info", "warning", "critical", "error"], default: "info" },
  message: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

module.exports = mongoose.model("Log", logSchema);
