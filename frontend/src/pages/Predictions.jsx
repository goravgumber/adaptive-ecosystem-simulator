import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import {
  Brain,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  ChevronRight,
  XCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { simAPI } from "../services/api";
import Badge from "../components/ui/Badge";
import Card from "../components/ui/Card";
import { formatPop } from "../utils/format";

const RISK_COLORS = {
  critical: "#EF4444",
  high: "#F59E0B",
  moderate: "#F59E0B",
  low: "#22C55E",
  minimal: "#22C55E",
};

const SPECIES_CONFIG = [
  { key: "plants", label: "Plants", color: "#4ADE80" },
  { key: "herbivores", label: "Herbivores", color: "#60A5FA" },
  { key: "carnivores", label: "Carnivores", color: "#F87171" },
];

function Gauge({ pct, color, size = 160 }) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 100) / 100);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#1C2E1C"
          strokeWidth={stroke}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-text-muted text-[10px] font-mono uppercase tracking-wider">
          Risk
        </span>
        <span
          className="text-2xl font-bold font-mono"
          style={{ color }}
        >
          {pct}%
        </span>
        <span className="text-text-muted text-[10px] font-mono capitalize">
          {pct <= 20 ? "low" : pct <= 40 ? "moderate" : pct <= 70 ? "high" : "critical"}
        </span>
      </div>
    </div>
  );
}

function ForecastTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-elevated border border-border rounded-lg p-3 shadow-card font-mono text-xs">
      <p className="text-text-muted mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {formatPop(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function Predictions() {
  const { authFetch } = useAuth();
  const [simRunning, setSimRunning] = useState(null);
  const [collapseRisk, setCollapseRisk] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const statusRes = await simAPI.status();
      const running = statusRes.data?.isRunning || false;
      setSimRunning(running);

      if (!running) {
        setCollapseRisk(null);
        setForecast(null);
        setRecommendations([]);
        return;
      }

      const [colRes, foreRes, recRes] = await Promise.allSettled([
        authFetch("/api/predictions/collapse", {
          method: "POST",
          body: JSON.stringify({ steps: 5 }),
        }),
        authFetch("/api/predictions/forecast", {
          method: "POST",
          body: JSON.stringify({ steps: 7 }),
        }),
        authFetch("/api/predictions/recommendations", {
          method: "POST",
        }),
      ]);

      if (colRes.status === "fulfilled" && colRes.value?.ok) {
        const d = await colRes.value.json();
        setCollapseRisk(d.prediction || d);
      }
      if (foreRes.status === "fulfilled" && foreRes.value?.ok) {
        const d = await foreRes.value.json();
        setForecast(d.forecast || d);
      }
      if (recRes.status === "fulfilled" && recRes.value?.ok) {
        const d = await recRes.value.json();
        setRecommendations(d.recommendations || []);
      }
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Predictions error:", err);
      setError("Failed to load predictions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 10000);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const riskLevel = collapseRisk?.riskLevel || "low";
  const riskPct = Math.round((collapseRisk?.collapseRisk || 0) * 100);
  const riskColor = RISK_COLORS[riskLevel] || RISK_COLORS.low;
  const confidence = collapseRisk?.confidence
    ? Math.round(collapseRisk.confidence * 100)
    : 0;
  const horizon = collapseRisk?.stepsAhead || 5;

  const chartData = (() => {
    if (!forecast?.predictions?.length) return [];
    const hist = forecast.historical || [];
    const hasHist = hist.length > 0;
    const result = [];
    for (let i = 0; i < hist.length; i++) {
      result.push({
        step: `H${i + 1}`,
        plants: Math.round(hist[i].plants || 0),
        herbivores: Math.round(hist[i].herbivores || 0),
        carnivores: Math.round(hist[i].carnivores || 0),
        _forecast: false,
        _boundary: false,
      });
    }
    if (hasHist && forecast.predictions.length > 0) {
      const last = result[result.length - 1];
      result.push({
        step: "",
        plants: last.plants,
        herbivores: last.herbivores,
        carnivores: last.carnivores,
        _forecast: false,
        _boundary: true,
      });
    }
    for (let i = 0; i < forecast.predictions.length; i++) {
      const p = forecast.predictions[i];
      result.push({
        step: `${i + 1}`,
        plants: Math.round(p.plants || 0),
        herbivores: Math.round(p.herbivores || 0),
        carnivores: Math.round(p.carnivores || 0),
        _forecast: true,
        _boundary: false,
      });
    }
    return result;
  })();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="w-7 h-7 text-accent" />
          <div>
            <h1 className="text-xl font-semibold text-text-primary font-mono">
              AI Predictions
            </h1>
            <p className="text-text-muted text-xs font-mono">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-dim text-base font-medium rounded-lg transition-all duration-150 disabled:opacity-40"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-danger-muted border border-danger/30 rounded-lg p-3">
          <XCircle className="w-4 h-4 text-danger shrink-0" />
          <span className="text-danger text-sm">{error}</span>
        </div>
      )}

      {/* Empty state — no simulation */}
      {simRunning === false && !loading && (
        <div className="flex flex-col items-center justify-center py-24 text-text-muted">
          <Brain className="w-16 h-16 text-accent mb-4" />
          <p className="text-text-primary font-medium mb-1">
            No active simulation
          </p>
          <Link
            to="/dashboard"
            className="text-accent hover:underline text-sm inline-flex items-center gap-1"
          >
            Start a simulation <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {simRunning && (
        <>
          {/* SECTION 1 — Collapse Risk */}
          <Card padding="p-5">
            <div className="flex items-start gap-6">
              <Gauge pct={riskPct} color={riskColor} />
              <div className="flex-1 min-w-0 space-y-3">
                <p className="text-text-muted text-xs font-mono uppercase tracking-wider">
                  Collapse Risk
                </p>
                <p className="text-4xl font-bold font-mono text-text-primary">
                  {riskPct}%
                </p>
                <div className="flex items-center gap-4 text-sm font-mono">
                  <span className="text-text-secondary">Confidence</span>
                  <span className="text-text-primary font-medium">
                    {confidence}%
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm font-mono">
                  <span className="text-text-secondary">Horizon</span>
                  <span className="text-text-primary font-medium">
                    {horizon} ticks
                  </span>
                </div>
                <div className="w-full h-2 bg-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${riskPct}%`,
                      backgroundColor: riskColor,
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* SECTION 2 — Population Forecast */}
          <Card padding="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent" />
                <span className="text-text-muted text-xs font-mono uppercase tracking-wider">
                  7-Tick Forecast
                </span>
              </div>
              <Badge variant="info">LSTM Model</Badge>
            </div>
            {chartData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart
                    data={chartData}
                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      stroke="#1C2E1C"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="step"
                      stroke="#4D7A4D"
                      tick={{
                        fill: "#4D7A4D",
                        fontSize: 11,
                        fontFamily: "JetBrains Mono",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#4D7A4D"
                      tick={{
                        fill: "#4D7A4D",
                        fontSize: 11,
                        fontFamily: "JetBrains Mono",
                      }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={formatPop}
                    />
                    <Tooltip content={<ForecastTooltip />} />
                    {SPECIES_CONFIG.map((s) => (
                      <Line
                        key={s.key}
                        type="monotone"
                        dataKey={s.key}
                        stroke={s.color}
                        strokeWidth={2}
                        dot={false}
                        name={s.label}
                        connectNulls
                      />
                    ))}
                    {/* Forecast dashed overlay */}
                    {SPECIES_CONFIG.map((s) => (
                      <Line
                        key={`forecast-${s.key}`}
                        type="monotone"
                        dataKey={s.key}
                        stroke={s.color}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        name={`${s.label} (forecast)`}
                        connectNulls
                        data={chartData.filter((d) => d._forecast || d._boundary)}
                      />
                    ))}
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-text-muted">
                <TrendingUp className="w-10 h-10 mb-2" />
                <p className="text-sm">No forecast data available</p>
              </div>
            )}
          </Card>

          {/* SECTION 3 — Smart Recommendations */}
          <Card padding="p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-text-muted text-xs font-mono uppercase tracking-wider">
                Recommendations
              </span>
              <Badge variant="info">AI</Badge>
            </div>
            {recommendations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-text-muted">
                <Lightbulb className="w-10 h-10 mb-2" />
                <p className="text-sm">
                  Ecosystem appears stable — no action needed
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recommendations.map((rec, i) => {
                  const sev = rec.severity || rec.priority || "info";
                  const borderColor =
                    sev === "critical" || sev === "high"
                      ? "border-l-danger"
                      : sev === "warning" || sev === "medium"
                        ? "border-l-warning"
                        : "border-l-accent";
                  const badgeVar =
                    sev === "critical" || sev === "high"
                      ? "danger"
                      : sev === "warning" || sev === "medium"
                        ? "warning"
                        : "success";
                  return (
                    <div
                      key={i}
                      className={`border-l-[3px] ${borderColor} bg-surface hover:bg-elevated transition rounded-lg p-4`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {sev === "critical" || sev === "high" ? (
                            <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                          ) : sev === "warning" || sev === "medium" ? (
                            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                          ) : (
                            <Lightbulb className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="text-text-primary text-sm font-medium">
                              {rec.description || rec.message || "Recommendation"}
                            </p>
                            {rec.impact && (
                              <p className="text-text-muted text-xs mt-1">
                                {rec.impact}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant={badgeVar} className="shrink-0">
                          {sev}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
