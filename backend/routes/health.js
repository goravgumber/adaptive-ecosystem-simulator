const express = require("express");
const router = express.Router();
const { healthCheck, livenessCheck, readinessCheck } = require("../controllers/healthController");

router.get("/", healthCheck);
router.get("/live", livenessCheck);
router.get("/ready", readinessCheck);

module.exports = router;
