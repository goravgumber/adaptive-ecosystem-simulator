import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Activity,
  Zap,
  RefreshCw
} from "lucide-react";

export default function AIInsights({ userId, authFetch }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchInsights = async () => {
    if (!userId || !authFetch) return;
    setLoading(true);
    try {
      const response = await authFetch(`/api/predictions?limit=10`);
      if (response.ok) {
        const data = await response.json();
        const generatedInsights = generateInsightsFromPredictions(data.predictions);
        setInsights(generatedInsights);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error("Error fetching AI insights:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateInsightsFromPredictions = (predictions) => {
    const insights = [];

    const collapsePredictions = predictions.filter(p => p.type === 'collapse');
    const latestCollapse = collapsePredictions[0];

    if (latestCollapse && latestCollapse.output?.collapseRisk > 0.7) {
      insights.push({
        id: 'high-collapse-risk',
        type: 'error',
        icon: AlertTriangle,
        title: 'High Collapse Risk Detected',
        message: `AI models predict ${Math.round(latestCollapse.output.collapseRisk * 100)}% chance of ecosystem collapse`,
        confidence: latestCollapse.confidence,
        action: 'Review recommendations immediately'
      });
    } else if (latestCollapse && latestCollapse.output?.collapseRisk > 0.4) {
      insights.push({
        id: 'moderate-risk',
        type: 'warning',
        icon: Activity,
        title: 'Ecosystem Stability Concern',
        message: `Moderate risk level detected (${Math.round(latestCollapse.output.collapseRisk * 100)}%)`,
        confidence: latestCollapse.confidence,
        action: 'Monitor population trends closely'
      });
    }

    const forecastPredictions = predictions.filter(p => p.type === 'forecast');
    const latestForecast = forecastPredictions[0];

    if (latestForecast?.output?.trends) {
      const trends = latestForecast.output.trends;
      const decliningPops = Object.entries(trends).filter(([, trend]) => trend === 'decreasing');

      if (decliningPops.length > 0) {
        insights.push({
          id: 'declining-populations',
          type: 'info',
          icon: TrendingUp,
          title: 'Population Decline Forecast',
          message: `${decliningPops.map(([pop]) => pop).join(', ')} populations showing declining trends`,
          confidence: latestForecast.confidence,
          action: 'Consider intervention strategies'
        });
      }
    }

    const recommendationPredictions = predictions.filter(p => p.type === 'recommendations');
    const highConfidenceRecs = recommendationPredictions.filter(p => p.confidence > 0.8);

    if (highConfidenceRecs.length > 0) {
      insights.push({
        id: 'high-confidence-recommendations',
        type: 'success',
        icon: Lightbulb,
        title: 'High-Confidence Recommendations Available',
        message: `${highConfidenceRecs.length} AI recommendations with >80% confidence`,
        confidence: Math.max(...highConfidenceRecs.map(r => r.confidence)),
        action: 'Review and apply recommendations'
      });
    }

    const accuratePredictions = predictions.filter(p => p.accuracy && p.accuracy > 0.8);
    if (accuratePredictions.length >= 5) {
      insights.push({
        id: 'ai-learning',
        type: 'info',
        icon: Brain,
        title: 'AI Models Performing Well',
        message: `${accuratePredictions.length} recent predictions achieved >80% accuracy`,
        confidence: 0.95,
        action: 'AI confidence is increasing over time'
      });
    }

    return insights;
  };

  useEffect(() => {
    fetchInsights();
    const interval = setInterval(fetchInsights, 120000);
    return () => clearInterval(interval);
  }, [userId, authFetch]);

  const getInsightStyle = (type) => {
    switch (type) {
      case 'error':
        return 'border-l-danger bg-danger-muted/20';
      case 'warning':
        return 'border-l-warning bg-warning-muted/20';
      case 'success':
        return 'border-l-accent bg-accent-muted/20';
      default:
        return 'border-l-info bg-info-muted/20';
    }
  };

  if (loading && insights.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-text-primary">AI Insights</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm text-text-muted">Analyzing ecosystem data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-4 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-text-primary">AI Insights</h3>
        </div>

        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-xs text-text-muted">
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchInsights}
            disabled={loading}
            className="p-1 text-text-muted hover:text-text-primary transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {insights.length === 0 ? (
        <div className="text-center py-6">
          <Zap className="w-8 h-8 text-text-muted mx-auto mb-2" />
          <p className="text-sm text-text-muted">No insights available</p>
          <p className="text-xs text-text-muted/60">Run more simulations to get AI insights</p>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => {
            const IconComponent = insight.icon;
            return (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-lg border-l-3 ${getInsightStyle(insight.type)} border border-l-0`}
              >
                <div className="flex items-start gap-3">
                  <IconComponent className={`w-5 h-5 mt-0.5 text-text-primary`} />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-text-primary">{insight.title}</h4>
                    <p className="text-sm text-text-secondary mt-1">{insight.message}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-text-muted">{insight.action}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-text-muted">Confidence:</span>
                        <span className="text-xs font-medium text-text-primary">{Math.round(insight.confidence * 100)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
