import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Bell,
  RefreshCw,
  AlertTriangle,
  AlertOctagon,
  CheckCircle,
  X,
  Activity,
  Cpu,
} from "lucide-react";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertOctagon,
    color: "text-danger",
    border: "border-l-danger",
    badge: "danger",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-warning",
    border: "border-l-warning",
    badge: "warning",
  },
  info: {
    icon: CheckCircle,
    color: "text-info",
    border: "border-l-info",
    badge: "info",
  },
};

function AlertIcon({ severity }) {
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info;
  const Icon = cfg.icon;
  return <Icon className={`w-5 h-5 ${cfg.color} shrink-0`} />;
}

export default function Alerts() {
  const { authFetch } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch("/api/v1/alerts?category=ecosystem");
      const data = await res.json();
      setAlerts(Array.isArray(data) ? data : data.alerts || data.data || []);
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  const dismissAlert = async (id) => {
    try {
      await authFetch(`/api/v1/alerts/${id}/dismiss`, { method: "PATCH" });
      setAlerts((prev) => prev.filter((a) => a._id !== id && a.id !== id));
    } catch (err) {
      console.error("Failed to dismiss alert:", err);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const filtered = alerts.filter((a) => {
    if (filter !== "all" && a.severity !== filter) return false;
    if (categoryFilter !== "all") {
      const cat = (a.category || "").toLowerCase();
      if (cat !== categoryFilter.toLowerCase()) return false;
    }
    return true;
  });

  const filters = ["all", "critical", "warning", "info"];
  const categories = ["all", "ecosystem", "system"];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-7 h-7 text-accent" />
          <h1 className="text-xl font-semibold text-text-primary font-mono">
            System Alerts
          </h1>
          <Badge variant={alerts.length > 0 ? "danger" : "neutral"}>
            {alerts.length}
          </Badge>
        </div>
        <button
          onClick={fetchAlerts}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-dim text-base font-medium rounded-lg transition-all duration-150 disabled:opacity-40"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-mono rounded-full border transition-all duration-150 ${
                filter === f
                  ? "bg-accent-muted border-accent/40 text-accent"
                  : "bg-surface border-border text-text-secondary hover:border-border-bright hover:text-text-primary"
              }`}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-border" />
        <div className="flex items-center gap-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1.5 text-xs font-mono rounded-full border transition-all duration-150 ${
                categoryFilter === c
                  ? "bg-accent-muted border-accent/40 text-accent"
                  : "bg-surface border-border text-text-secondary hover:border-border-bright hover:text-text-primary"
              }`}
            >
              {c === "all" ? "All" : c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-text-muted">
          <CheckCircle className="w-12 h-12 text-accent mb-3" />
          <p className="text-text-primary font-medium">No alerts</p>
        </div>
      )}

      {/* Alert list */}
      <div className="space-y-3">
        {filtered.map((alert) => {
          const sev = alert.severity || "info";
          const cfg = SEVERITY_CONFIG[sev] || SEVERITY_CONFIG.info;
          const cat = (alert.category || "ecosystem").toLowerCase();
          const catLabel = cat.charAt(0).toUpperCase() + cat.slice(1);
          const alertId = alert._id || alert.id;

          return (
            <div
              key={alertId}
              className={`${cfg.border} bg-surface hover:bg-elevated transition cursor-default rounded-lg border border-border border-l-[3px]`}
            >
              <div className="flex items-start justify-between p-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <AlertIcon severity={sev} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant={cfg.badge}>{sev.toUpperCase()}</Badge>
                      <Badge variant="neutral">{catLabel}</Badge>
                      <span className="text-text-muted text-xs font-mono ml-auto shrink-0">
                        {new Date(alert.timestamp || alert.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-text-primary text-sm">
                      {alert.message || alert.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => dismissAlert(alertId)}
                  className="shrink-0 ml-2 p-1 rounded hover:bg-elevated text-text-muted hover:text-text-primary transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
