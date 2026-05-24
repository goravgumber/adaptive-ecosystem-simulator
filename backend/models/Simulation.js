const mongoose = require("mongoose");

const simulationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    step: { type: Number, required: true },
    plants: { type: Number, required: true },
    herbivores: { type: Number, required: true },
    carnivores: { type: Number, required: true },

    events: [
      {
        type: { type: String, default: "ecosystem" },
        message: { type: String },
        severity: {
          type: String,
          enum: ["info", "warning", "critical"],
          default: "info",
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    template: {
      type: String,
      enum: ["Default", "Savanna", "Rainforest", "Arctic"],
      default: "Default",
    },

    time: { type: Date, default: Date.now },

    sessionId: { type: mongoose.Schema.Types.ObjectId },
    endedAt: { type: Date },
    duration: { type: Number },
    outcome: { type: String, enum: ["stable", "collapsed", "paused"] },
    peakPopulations: {
      plants: { type: Number },
      herbivores: { type: Number },
      carnivores: { type: Number },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Simulation", simulationSchema);
