const tf = require('@tensorflow/tfjs');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const fetch = global.fetch || require('node-fetch');
const Simulation = require('../models/Simulation');
const Prediction = require('../models/Prediction');
const logger = require('../config/logger');

class AIService {
  constructor() {
    this.models = {
      collapsePredictor: null,
      populationForecaster: null,
      recommendationEngine: null,
    };

    this.isInitialized = false;
    this.pythonServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    this.pythonExecutable = process.env.PYTHON_EXECUTABLE || 'python3';
    this.pythonScriptPath = path.join(__dirname, '../ml-service/ml_service.py');
    this.mlProcess = null;
    this.mlServiceReady = false;
    this.mlServiceStarting = false;
    this.mlServiceError = null;
    this.startupTimeoutMs = Number(process.env.ML_SERVICE_STARTUP_TIMEOUT_MS || 15000);
    this.maxRetries = Number(process.env.ML_SERVICE_STARTUP_RETRIES || 3);
    this.retryIntervalMs = Number(process.env.ML_SERVICE_RETRY_INTERVAL_MS || 5000);
  }

  async initialize() {
    try {
      logger.info(' Initializing AI Service...');
      await this.loadModels();
      const started = await this.startPythonService();
      this.isInitialized = started;

      if (started) {
        logger.info(' AI Service initialized successfully');
      } else {
        logger.warn(' AI Service initialization failed; Python ML service did not start cleanly');
      }

      return started;
    } catch (error) {
      logger.error(' Failed to initialize AI Service: %s', error.message);
      this.mlServiceError = error.message;
      return false;
    }
  }

  async loadModels() {
    try {
      const modelsDir = path.join(__dirname, '../ml-models');
      await fs.mkdir(modelsDir, { recursive: true });

      const collapsePath = path.join(modelsDir, 'collapse-predictor', 'model.json');
      try {
        this.models.collapsePredictor = await tf.loadLayersModel(`file://${collapsePath}`);
        logger.info(' Collapse predictor model loaded');
      } catch (err) {
        logger.info(' Collapse predictor model not found locally');
      }

      const populationPath = path.join(modelsDir, 'population-forecaster', 'model.json');
      try {
        this.models.populationForecaster = await tf.loadLayersModel(`file://${populationPath}`);
        logger.info(' Population forecaster model loaded');
      } catch (err) {
        logger.info(' Population forecaster model not found locally');
      }
    } catch (error) {
      logger.error(' Error loading TensorFlow.js models: %s', error.message);
    }
  }

  async startPythonService() {
    if (this.mlServiceReady) return true;
    if (this.mlServiceStarting) return this.waitForStartup();

    try {
      if (await this._verifyHealthEndpoint()) {
        this.mlServiceReady = true;
        logger.info("Using configured ML service at %s", this.pythonServiceUrl);
        return true;
      }
    } catch (error) {
      logger.debug("Configured ML service is not ready; starting local process: %s", error.message);
    }

    this.mlServiceStarting = true;
    this.mlServiceError = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt += 1) {
      try {
        const success = await this._spawnPythonService(attempt);
        if (success) {
          this.mlServiceStarting = false;
          this.mlServiceReady = true;
          return true;
        }
      } catch (error) {
        this.mlServiceError = error.message;
        logger.error('Python ML service startup attempt %d failed: %s', attempt, error.message);
        if (attempt < this.maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, this.retryIntervalMs));
        }
      }
    }

    this.mlServiceStarting = false;
    return false;
  }

  _spawnPythonService(attempt) {
    return new Promise((resolve, reject) => {
      let settled = false;
      let timeoutHandle = null;

      const cleanup = () => {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          timeoutHandle = null;
        }
      };

      try {
        this.mlProcess = spawn(this.pythonExecutable, [this.pythonScriptPath], {
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env, PYTHONUNBUFFERED: '1' },
        });
      } catch (error) {
        reject(new Error(`Failed to spawn Python process: ${error.message}`));
        return;
      }

      const onProcessOutput = async (data, outputWriter) => {
        const text = data.toString();
        outputWriter(`[ML] ${text}`);

        if (text.includes('ML Service started successfully')) {
          try {
            const healthy = await this._verifyHealthEndpoint();
            if (!settled) {
              settled = true;
              cleanup();
              if (healthy) {
                resolve(true);
              } else {
                reject(new Error('Python ML health endpoint did not return a healthy status'));
              }
            }
          } catch (error) {
            if (!settled) {
              settled = true;
              cleanup();
              reject(new Error(`Health check failure: ${error.message}`));
            }
          }
        }
      };

      this.mlProcess.stdout.on('data', (data) => onProcessOutput(data, process.stdout.write.bind(process.stdout)));
      this.mlProcess.stderr.on('data', (data) => onProcessOutput(data, process.stderr.write.bind(process.stderr)));

      this.mlProcess.on('exit', (code, signal) => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(new Error(`Python ML process exited early with code ${code} signal ${signal}`));
        }
        this.mlServiceReady = false;
      });

      timeoutHandle = setTimeout(() => {
        if (!settled) {
          settled = true;
          if (this.mlProcess && !this.mlProcess.killed) {
            this.mlProcess.kill();
          }
          reject(new Error('Python ML service startup timed out'));
        }
      }, this.startupTimeoutMs);
    });
  }

  async _verifyHealthEndpoint() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${this.pythonServiceUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Health endpoint returned ${response.status}`);
      }
      const payload = await response.json();
      return payload && (payload.status === 'pass' || payload.status === 'ok');
    } finally {
      clearTimeout(timeout);
    }
  }

  waitForStartup() {
    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        if (this.mlServiceReady) {
          clearInterval(interval);
          resolve(true);
        }
      }, 500);
    });
  }

  async getMlHealth() {
    const health = {
      ready: this.mlServiceReady,
      started: !!this.mlProcess,
      error: this.mlServiceError,
      url: this.pythonServiceUrl,
      processRunning: !!(this.mlProcess && !this.mlProcess.killed),
    };

    if (this.mlServiceReady) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const response = await fetch(`${this.pythonServiceUrl}/health`, {
          method: 'GET',
          signal: controller.signal,
        });

        if (response.ok) {
          health.details = await response.json();
          health.healthy = true;
        } else {
          health.healthy = false;
          health.error = `Health endpoint returned ${response.status}`;
        }
        clearTimeout(timeout);
      } catch (error) {
        health.healthy = false;
        health.error = error.message;
      }
    }

    return health;
  }

  async predictCollapse(userId, steps = 5) {
    try {
      const recentData = await this.getRecentSimulationData(userId, 50);
      if (recentData.length < 10) {
        return {
          success: false,
          error: 'Insufficient data for prediction (need at least 10 simulation steps)',
        };
      }

      const features = this.prepareCollapseFeatures(recentData);
      let prediction;

      if (this.models.collapsePredictor) {
        prediction = await this.predictWithTensorFlow(features, 'collapse');
      } else {
        const lastData = recentData[recentData.length - 1] || {};
        prediction = await this.callPythonService('/predict/collapse', {
          plants: lastData.plants || 0,
          herbivores: lastData.herbivores || 0,
          carnivores: lastData.carnivores || 0,
          tick: lastData.step || 0,
          history: recentData,
        });
      }

      await this.storePrediction({
        userId,
        type: 'collapse',
        input: features,
        output: prediction,
        stepsAhead: steps,
        confidence: prediction.confidence || 0.5,
      });

      return {
        success: true,
        prediction: {
          collapseRisk: prediction.risk || prediction.probability || 0.5,
          confidence: prediction.confidence || 0.5,
          riskLevel: this.getRiskLevel(prediction.risk || prediction.probability || 0.5),
          stepsAhead: steps,
          factors: prediction.factors || this.analyzeRiskFactors(features),
          timestamp: new Date(),
        },
      };
    } catch (error) {
      logger.error(' Error predicting collapse: %s', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async forecastPopulations(userId, steps = 7) {
    try {
      const recentData = await this.getRecentSimulationData(userId, 100);
      if (recentData.length < 20) {
        return {
          success: false,
          error: 'Insufficient data for forecasting (need at least 20 simulation steps)',
        };
      }

      const timeSeriesData = this.prepareTimeSeriesData(recentData);
      let forecast;

      if (this.models.populationForecaster) {
        forecast = await this.forecastWithTensorFlow(timeSeriesData, steps);
      } else {
        const lastData = timeSeriesData[timeSeriesData.length - 1] || {};
        forecast = await this.callPythonService('/predict/populations', {
          plants: lastData.plants || 0,
          herbivores: lastData.herbivores || 0,
          carnivores: lastData.carnivores || 0,
          tick: lastData.step || 0,
          history: timeSeriesData,
        });
      }

      const predictions = Array.isArray(forecast.predictions)
        ? forecast.predictions.map((p) => (Array.isArray(p) ? { plants: p[0], herbivores: p[1], carnivores: p[2] } : p))
        : [];

      await this.storePrediction({
        userId,
        type: 'forecast',
        input: timeSeriesData,
        output: { predictions },
        stepsAhead: steps,
        confidence: forecast.confidence || 0.7,
      });

      return {
        success: true,
        forecast: {
          predictions,
          confidence: forecast.confidence || 0.7,
          trends: forecast.trends || this.analyzeTrends(recentData),
          stepsAhead: steps,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      logger.error(' Error forecasting populations: %s', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async callPythonService(endpoint, data) {
    try {
      const response = await fetch(`${this.pythonServiceUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Python service error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Python service error: ${error.message}`);
    }
  }

  async getRecentSimulationData(userId, limit = 50) {
    try {
      const data = await Simulation.find({ userId })
        .sort({ step: -1 })
        .limit(limit)
        .select('step plants herbivores carnivores events createdAt')
        .lean();
      return data.reverse();
    } catch (error) {
      logger.error('Error fetching simulation data: %s', error.message);
      return [];
    }
  }

  prepareCollapseFeatures(data) {
    const latest = data[data.length - 1];
    const window = data.slice(-5);
    const plants = window.map((item) => item.plants);
    const herbivores = window.map((item) => item.herbivores);
    const carnivores = window.map((item) => item.carnivores);

    return [
      latest.plants,
      latest.herbivores,
      latest.carnivores,
      this.calculateTrend(plants),
      this.calculateTrend(herbivores),
      this.calculateTrend(carnivores),
      this.calculateVolatility(plants),
      this.calculateVolatility(herbivores),
      this.calculateVolatility(carnivores),
    ];
  }

  prepareTimeSeriesData(data) {
    return data.map((point) => ({
      step: point.step,
      plants: point.plants,
      herbivores: point.herbivores,
      carnivores: point.carnivores,
      createdAt: point.createdAt,
    }));
  }

  calculateTrend(values) {
    if (values.length < 2) return 0;
    return (values[values.length - 1] - values[0]) / (values.length - 1);
  }

  calculateVolatility(values) {
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  analyzeTrends(data) {
    if (!data || data.length < 2) return { plants: 'stable', herbivores: 'stable', carnivores: 'stable' };
    const getTrend = (key) => {
      const window = data.slice(-10);
      const first = window[0][key];
      const last = window[window.length - 1][key];
      const pct = first !== 0 ? ((last - first) / first) : 0;
      if (pct > 0.05) return 'increasing';
      if (pct < -0.05) return 'decreasing';
      return 'stable';
    };
    return {
      plants: getTrend('plants'),
      herbivores: getTrend('herbivores'),
      carnivores: getTrend('carnivores'),
    };
  }

  getRiskLevel(risk) {
    if (risk > 0.8) return 'critical';
    if (risk > 0.6) return 'high';
    if (risk > 0.4) return 'moderate';
    if (risk > 0.2) return 'low';
    return 'minimal';
  }

  analyzeRiskFactors(features) {
    const factors = [];
    if (features[0] < 20) {
      factors.push({ factor: 'Low plants', impact: 'high' });
    }
    if (features[1] < 10) {
      factors.push({ factor: 'Low herbivores', impact: 'high' });
    }
    if (features[2] < 5) {
      factors.push({ factor: 'Low carnivores', impact: 'medium' });
    }
    return factors;
  }

  async predictWithTensorFlow(features, type) {
    if (type === 'collapse' && this.models.collapsePredictor) {
      const tensor = tf.tensor2d([features]);
      const result = this.models.collapsePredictor.predict(tensor);
      const value = result.dataSync()[0];
      return { risk: value, confidence: 0.8 };
    }
    throw new Error('TensorFlow model not available');
  }

  async forecastWithTensorFlow(timeSeriesData) {
    throw new Error('TensorFlow population forecasting is not implemented');
  }

  async storePrediction(predictionData) {
    try {
      const prediction = new Prediction({
        userId: predictionData.userId,
        type: predictionData.type,
        input: predictionData.input,
        output: predictionData.output,
        stepsAhead: predictionData.stepsAhead,
        confidence: predictionData.confidence,
        timestamp: new Date(),
      });
      await prediction.save();
      return prediction;
    } catch (error) {
      logger.error('Error storing prediction: %s', error.message);
      return null;
    }
  }

  async generateRecommendations(userId) {
    try {
      const data = await this.getRecentSimulationData(userId, 50);
      if (data.length < 5) {
        return { success: false, error: 'Insufficient data for recommendations' };
      }

      const latest = data[data.length - 1];
      const riskFactors = [];

      if (latest.plants < 500) {
        riskFactors.push({
          type: 'plants',
          severity: 'high',
          message: 'Plant population critically low, ecosystem may collapse',
          action: 'Reduce herbivore population or introduce more plants',
        });
      }
      if (latest.herbivores > latest.plants * 0.8) {
        riskFactors.push({
          type: 'herbivores',
          severity: 'high',
          message: 'Herbivore population exceeds sustainable levels',
          action: 'Increase carnivore population to control herbivores',
        });
      }
      if (latest.carnivores > latest.herbivores * 1.5 && latest.herbivores > 0) {
        riskFactors.push({
          type: 'carnivores',
          severity: 'medium',
          message: 'Carnivore population may outstrip herbivore supply',
          action: 'Reduce carnivore population or increase herbivores',
        });
      }

      const trends = {
        plants: this.calculateTrend(data.slice(-10).map((d) => d.plants)),
        herbivores: this.calculateTrend(data.slice(-10).map((d) => d.herbivores)),
        carnivores: this.calculateTrend(data.slice(-10).map((d) => d.carnivores)),
      };

      return {
        success: true,
        recommendations: riskFactors,
        reasoning: 'Based on current population levels and recent trends',
        confidence: 0.7,
      };
    } catch (error) {
      logger.error('Error generating recommendations: %s', error.message);
      return { success: false, error: error.message };
    }
  }

  async detectPatterns(userId) {
    try {
      const data = await this.getRecentSimulationData(userId, 100);
      if (data.length < 20) {
        return { success: false, error: 'Insufficient data for pattern detection' };
      }

      const plants = data.map((d) => d.plants);
      const herbivores = data.map((d) => d.herbivores);
      const carnivores = data.map((d) => d.carnivores);

      const detectCycles = (arr) => {
        const peaks = [];
        for (let i = 1; i < arr.length - 1; i++) {
          if (arr[i] > arr[i - 1] && arr[i] > arr[i + 1]) {
            peaks.push({ index: i, value: arr[i] });
          }
        }
        return peaks.length > 2
          ? {
              detected: true,
              cycleCount: peaks.length,
              avgInterval: Math.round((peaks[peaks.length - 1].index - peaks[0].index) / (peaks.length - 1)),
            }
          : { detected: false, cycleCount: 0 };
      };

      return {
        success: true,
        patterns: {
          plants: detectCycles(plants),
          herbivores: detectCycles(herbivores),
          carnivores: detectCycles(carnivores),
        },
      };
    } catch (error) {
      logger.error('Error detecting patterns: %s', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new AIService();
