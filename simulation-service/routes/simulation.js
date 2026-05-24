const express = require("express");
const ecosystemEngine = require("../services/ecosystemEngine");

let currentState = { plants: 1000, herbivores: 200, carnivores: 50 };

const router = express.Router();

router.post("/tick", (req, res) => {
  const { plants, herbivores, carnivores } = req.body;
  if (plants !== undefined) currentState.plants = plants;
  if (herbivores !== undefined) currentState.herbivores = herbivores;
  if (carnivores !== undefined) currentState.carnivores = carnivores;

  currentState = ecosystemEngine.tick(currentState);
  res.json(currentState);
});

router.post("/reset", (req, res) => {
  currentState = ecosystemEngine.reset(req.body);
  res.json(currentState);
});

router.get("/state", (req, res) => {
  res.json(currentState);
});

module.exports = router;
