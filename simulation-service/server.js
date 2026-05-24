const express = require("express");
const simulationRoutes = require("./routes/simulation");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.use("/", simulationRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "simulation" });
});

app.listen(PORT, () => {
  console.log(`Simulation service running on port ${PORT}`);
});
