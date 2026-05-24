const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  simulationId: { type: mongoose.Schema.Types.ObjectId },
  sessionId: { type: mongoose.Schema.Types.ObjectId },
  type: { type: String, enum: ["critical", "warning", "info"], required: true },
  category: { type: String, enum: ["ecosystem", "system"], default: "ecosystem" },
  message: { type: String, required: true },
  tick: { type: Number },
  data: { type: mongoose.Schema.Types.Mixed },
  dismissed: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("Alert", alertSchema);
