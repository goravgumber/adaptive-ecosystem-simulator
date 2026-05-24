import { useState, useEffect, useCallback, useRef } from "react";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import StatCard from "../components/ui/StatCard";
import { mlAPI } from "../services/api";
import { formatDate } from "../utils/format";

const BACKEND = import.meta.env.VITE_API_URL || "";

function latencyColor(ms) {
  if (ms === null || ms === undefined) return "text-text-muted";
  if (ms < 100) return "text-accent";
  if (ms <= 500) return "text-warning";
  return "text-danger";
}

export default function Monitoring() {
  const [backendLatency, setBackendLatency] = useState(null);
  const [mlLatency, setMlLatency] = useState(null);
  const [mongoStatus, setMongoStatus] = useState("Unknown");
  const [redisStatus, setRedisStatus] = useState("Unknown");
  const [modelInfo, setModelInfo] = useState(null);
  const [queueStats, setQueueStats] = useState(null);
  const [countdown, setCountdown] = useState(10);
  const intervalRef = useRef(null);
  const countdownRef = useRef(null);

  const fetchAll = useCallback(async () => {
    // Backend health
    const t0 = Date.now();
    try {
      const res = await fetch(`${BACKEND}/health`);
      const data = await res.json();
      setBackendLatency(Date.now() - t0);
      const svc = data.data?.services || data.services || {};
      const mongo = svc.mongodb?.status || svc.database?.status || "Unknown";
      const redis = svc.redis?.status || "Unknown";
      setMongoStatus(mongo === "healthy" || mongo === "connected" || mongo === "up" ? "Connected" : mongo === "disconnected" ? "Disconnected" : mongo);
      setRedisStatus(redis === "healthy" || redis === "connected" || redis === "up" ? "Connected" : redis === "disconnected" ? "Disconnected" : redis);
    } catch {
      setBackendLatency(null);
      setMongoStatus("Disconnected");
      setRedisStatus("Disconnected");
    }

    // ML health
    const t1 = Date.now();
    const mlRes = await mlAPI.health();
    setMlLatency(mlRes.data ? Date.now() - t1 : null);

    // Model info
    const modelRes = await mlAPI.modelsInfo();
    if (modelRes.data) setModelInfo(modelRes.data);

    // Queue stats
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BACKEND}/api/v1/queue/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const body = await res.json();
        setQueueStats(body.data || body);
      }
    } catch {
      /* ignore */
    }

    setCountdown(10);
  }, []);

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(fetchAll, 10000);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(countdownRef.current);
    };
  }, [fetchAll]);

  const nextRetrain = modelInfo?.trained_at
    ? Math.max(
        0,
        Math.round(
          24 -
            (Date.now() - new Date(modelInfo.trained_at).getTime()) / 3600000
        )
      )
    : null;

  const healthServices = [
    {
      label: "Backend",
      value: backendLatency !== null ? `${backendLatency}ms` : "N/A",
      latency: backendLatency,
      healthy: backendLatency !== null,
    },
    {
      label: "ML Service",
      value: mlLatency !== null ? `${mlLatency}ms` : "N/A",
      latency: mlLatency,
      healthy: mlLatency !== null,
    },
    {
      label: "MongoDB",
      value: mongoStatus,
      latency: null,
      healthy: mongoStatus === "Connected",
    },
    {
      label: "Redis",
      value: redisStatus,
      latency: null,
      healthy: redisStatus === "Connected",
    },
  ];

  function valueColor(val) {
    if (val === null || val === undefined) return "text-text-muted";
    const n = typeof val === "number" ? val : parseFloat(val);
    if (isNaN(n)) return "text-text-primary";
    if (n >= 90) return "text-accent";
    if (n >= 70) return "text-warning";
    return "text-danger";
  }

  const modelMetrics = modelInfo
    ? [
        {
          label: "Accuracy",
          value: modelInfo.accuracy
            ? `${(modelInfo.accuracy * 100).toFixed(1)}%`
            : "N/A",
          raw: modelInfo.accuracy ? modelInfo.accuracy * 100 : null,
        },
        {
          label: "Precision",
          value: modelInfo.precision
            ? `${(modelInfo.precision * 100).toFixed(1)}%`
            : "N/A",
          raw: modelInfo.precision ? modelInfo.precision * 100 : null,
        },
        {
          label: "Recall",
          value: modelInfo.recall
            ? `${(modelInfo.recall * 100).toFixed(1)}%`
            : "N/A",
          raw: modelInfo.recall ? modelInfo.recall * 100 : null,
        },
        {
          label: "F1 Score",
          value: modelInfo.f1
            ? `${(modelInfo.f1 * 100).toFixed(1)}%`
            : "N/A",
          raw: modelInfo.f1 ? modelInfo.f1 * 100 : null,
        },
        {
          label: "Trained",
          value: formatDate(modelInfo.trained_at),
          raw: null,
        },
      ]
    : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-text-primary font-mono">
            System Monitoring
          </h1>
        </div>
        <span className="text-text-muted text-xs font-mono">
          Auto-refresh in {countdown}s
        </span>
      </div>

      {/* ROW 1 — Service Health */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {healthServices.map((svc) => (
          <Card key={svc.label} padding="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-text-muted text-xs font-mono uppercase tracking-wider">
                {svc.label}
              </p>
              <span
                className={`w-2 h-2 rounded-full ${
                  svc.healthy
                    ? "bg-accent animate-pulse"
                    : "bg-danger"
                }`}
              />
            </div>
            <p
              className={`text-text-primary text-xl font-mono font-medium ${
                svc.latency !== null ? latencyColor(svc.latency) : ""
              }`}
            >
              {svc.value}
            </p>
            {svc.label === "MongoDB" && (
              <p className="text-text-muted text-[10px] font-mono mt-1">
                {svc.healthy ? "Connected" : "Disconnected"}
              </p>
            )}
          </Card>
        ))}
      </div>

      {/* ROW 2 — Model Info */}
      <Card padding="p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-text-muted text-xs font-mono uppercase tracking-wider">
            Model Info
          </p>
          {modelInfo?.version && (
            <Badge variant="neutral">v{modelInfo.version}</Badge>
          )}
        </div>
        {modelMetrics.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {modelMetrics.map((m) => (
              <div key={m.label}>
                <p className="text-text-muted text-xs font-mono mb-1">
                  {m.label}
                </p>
                <p
                  className={`text-text-primary text-lg font-mono font-medium ${
                    m.raw !== null ? valueColor(m.raw) : ""
                  }`}
                >
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-text-muted text-sm font-mono">
            No model data available
          </p>
        )}
        {nextRetrain !== null && (
          <p className="text-text-muted text-xs font-mono mt-4">
            Next retraining in ~{nextRetrain}h
          </p>
        )}
      </Card>

      {/* ROW 3 — Queue Status */}
      <Card padding="p-5">
        <p className="text-text-muted text-xs font-mono uppercase tracking-wider mb-4">
          Queue Status
        </p>
        {queueStats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-text-muted text-xs font-mono mb-1">
                Completed
              </p>
              <p className="text-accent text-xl font-mono font-medium">
                {queueStats.completed || 0}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-text-muted text-xs font-mono">Failed</p>
                {(queueStats.failed || 0) > 0 && (
                  <Badge variant="danger">{queueStats.failed}</Badge>
                )}
              </div>
              <p className="text-danger text-xl font-mono font-medium">
                {queueStats.failed || 0}
              </p>
            </div>
            <div>
              <p className="text-text-muted text-xs font-mono mb-1">
                Active
              </p>
              <p className="text-warning text-xl font-mono font-medium animate-pulse">
                {queueStats.active || 0}
              </p>
            </div>
            <div>
              <p className="text-text-muted text-xs font-mono mb-1">
                Delayed
              </p>
              <p className="text-text-primary text-xl font-mono font-medium">
                {queueStats.delayed || 0}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-text-muted text-sm font-mono">
            Queue stats unavailable
          </p>
        )}
      </Card>
    </div>
  );
}
