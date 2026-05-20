const tf = require('@tensorflow/tfjs');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const fetch = global.fetch || require('node-fetch');
const Simulation = require('../models/Simulation');
const Prediction = require('../models/Prediction');

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
    this.pythonScriptPath = path.join(__dirname, '../ml-service/app.py');
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
      console.log('🤖 Initializing AI Service...');
      await this.loadModels();
      const started = await this.startPythonService();
      this.isInitialized = started;

      if (started) {
        console.log('✅ AI Service initialized successfully');
      } else {
        console.warn('⚠️ AI Service initialization failed; Python ML service did not start cleanly');
      }

      return started;
    } catch (error) {
      console.error('❌ Failed to initialize AI Service:', error);
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
        console.log('✅ Collapse predictor model loaded');
      } catch (err) {
        console.log('ℹ️ Collapse predictor model not found locally');
      }

      const populationPath = path.join(modelsDir, 'population-forecaster', 'model.json');
      try {
        this.models.populationForecaster = await tf.loadLayersModel(`file://${populationPath}`);
        console.log('✅ Population forecaster model loaded');
      } catch (err) {
        console.log('ℹ️ Population forecaster model not found locally');
      }
    } catch (error) {
      console.error('❌ Error loading TensorFlow.js models:', error);
    }
  }

  async startPythonService() {
    if (this.mlServiceReady) return true;
    if (this.mlServiceStarting) return this.waitForStartup();

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
        console.error(`Python ML service startup attempt ${attempt} failed:`, error.message);
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
      return payload && payload.status === 'pass';
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
        prediction = await this.callPythonService('/predict/collapse', {
          recentData,
          steps,
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
      console.error('❌ Error predicting collapse:', error);
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
        forecast = await this.callPythonService('/predict/populations', {
          timeSeries: timeSeriesData,
          steps,
        });
      }

      await this.storePrediction({
        userId,
        type: 'forecast',
        input: timeSeriesData,
        output: forecast,
        stepsAhead: steps,
        confidence: forecast.confidence || 0.7,
      });

      return {
        success: true,
        forecast: {
          predictions: forecast.predictions || this.generateDummyForecast(recentData, steps),
          confidence: forecast.confidence || 0.7,
          trends: forecast.trends || this.analyzeTrends(recentData),
          stepsAhead: steps,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      console.error('❌ Error forecasting populations:', error);
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
      console.warn('Python service unavailable, using fallback predictions');
      return this.generateFallbackPrediction(endpoint, data);
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
      console.error('Error fetching simulation data:', error);
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

  generateFallbackPrediction(endpoint, data) {
    if (endpoint.includes('collapse')) {
      return {
        risk: Math.min(0.95, 0.2 + Math.random() * 0.5),
        confidence: 0.5,
        factors: [],
      };
    }

    if (endpoint.includes('populations')) {
      return {
        predictions: this.generateDummyForecast(data.timeSeries, data.steps),
        confidence: 0.5,
      };
    }

    return { error: 'Fallback prediction not available' };
  }

  generateDummyForecast(recentData, steps) {
    const latest = recentData[recentData.length - 1];
    const trend = this.calculateTrend(recentData.map((item) => item.plants));
    const forecast = [];
    for (let i = 1; i <= steps; i += 1) {
      forecast.push({
        step: latest.step + i,
        plants: Math.max(0, latest.plants + trend * i),
        herbivores: Math.max(0, latest.herbivores + trend * i * 0.8),
        carnivores: Math.max(0, latest.carnivores + trend * i * 0.5),
      });
    }
    return forecast;
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
      console.error('Error storing prediction:', error);
      return null;
    }
  }
}

module.exports = new AIService();
