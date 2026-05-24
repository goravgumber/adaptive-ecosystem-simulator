import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatPop, formatDuration, formatDate } from "../utils/format";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import LineChart from "../components/ui/LineChart";
import Skeleton from "../components/ui/Skeleton";

const filters = ["All", "Running", "Stable", "Collapsed"];

const OUTCOME_CONFIG = {
  running: { variant: "neutral", label: "Running" },
  stable: { variant: "success", label: "Stable" },
  collapsed: { variant: "danger", label: "Collapsed" },
};

function downloadJSON(run) {
  const blob = new Blob([JSON.stringify(run, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `run-${run.id || "export"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function History() {
  const { authFetch } = useAuth();
  const [runs, setRuns] = useState([]);
  const [filter, setFilter] = useState("All");
  const [selectedRun, setSelectedRun] = useState(null);
  const [runHistory, setRunHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await authFetch("/api/v1/simulation-history");
        const json = await res.json();
        const data = json.success && json.data ? json.data : json;
        setRuns(Array.isArray(data) ? data : data?.runs || []);
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [authFetch]);

  const handleRowClick = async (run) => {
    setSelectedRun(run);
    setRunHistory([]);
    setHistoryLoading(true);
    try {
      const res = await authFetch(`/api/v1/simulation-history/${run.id}`);
      const ticks = await res.json();
      setRunHistory(Array.isArray(ticks) ? ticks : []);
    } catch (err) {
      console.error("Failed to fetch run history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (filter === "All") return runs;
    return runs.filter(
      (r) => (r.outcome || "running").toLowerCase() === filter.toLowerCase()
    );
  }, [runs, filter]);

  const chartSeries = [
    { key: "plants", color: "#4ADE80", label: "Plants" },
    { key: "herbivores", color: "#60A5FA", label: "Herbivores" },
    { key: "carnivores", color: "#F87171", label: "Carnivores" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-text-primary text-xl font-semibold font-mono">
        Simulation History
      </h1>

      <div className="flex gap-2">
        {filters.map((f) => (
          <Button
            key={f}
            variant={filter === f ? "primary" : "ghost"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="block" height={48} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card padding="p-12">
          <div className="text-center space-y-3">
            <p className="text-text-muted text-sm font-mono">
              {filter === "All"
                ? "No simulations found. Start one from the Dashboard."
                : `No ${filter.toLowerCase()} simulations found.`}
            </p>
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="bg-surface rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-elevated text-text-muted text-xs font-mono uppercase tracking-wider">
                <th className="p-3 text-left">RUN</th>
                <th className="p-3 text-left">STARTED</th>
                <th className="p-3 text-left">DURATION</th>
                <th className="p-3 text-left">OUTCOME</th>
                <th className="p-3 text-right">PEAK PLANTS</th>
                <th className="p-3 text-right">PEAK HERBIVORES</th>
                <th className="p-3 text-right">PEAK CARNIVORES</th>
                <th className="p-3 text-right">EXPORT</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((run, idx) => {
                const cfg = OUTCOME_CONFIG[run.outcome] || OUTCOME_CONFIG.running;
                return (
                <tr
                  key={run.id || idx}
                  onClick={() => handleRowClick(run)}
                  className={`hover:bg-elevated transition border-b border-border last:border-b-0 cursor-pointer ${run.outcome === "running" ? "border-l-2 border-l-accent" : ""}`}
                >
                  <td className="p-3 text-text-primary font-mono">
                    {run.id ? run.id.slice(-6) : idx + 1}
                  </td>
                  <td className="p-3 text-text-muted font-mono">
                    {formatDate(run.startedAt)}
                  </td>
                  <td className="p-3 text-text-muted font-mono">
                    {formatDuration(run.duration)}
                  </td>
                  <td className="p-3">
                    <Badge variant={cfg.variant}>
                      {cfg.label}
                    </Badge>
                  </td>
                  <td className="p-3 text-right text-text-primary font-mono">
                    {formatPop(run.peakPlants)}
                  </td>
                  <td className="p-3 text-right text-text-primary font-mono">
                    {formatPop(run.peakHerbivores)}
                  </td>
                  <td className="p-3 text-right text-text-primary font-mono">
                    {formatPop(run.peakCarnivores)}
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadJSON(run);
                      }}
                    >
                      ↓ JSON
                    </Button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={!!selectedRun}
        onClose={() => { setSelectedRun(null); setRunHistory([]); }}
        title={`Run ${selectedRun?.id ? selectedRun.id.slice(-6) : ""}`}
      >
        {historyLoading ? (
          <div className="space-y-2 py-8">
            <Skeleton height="1rem" />
            <Skeleton height="1rem" width="85%" />
            <Skeleton height="1rem" width="65%" />
          </div>
        ) : runHistory.length > 0 ? (
          <LineChart
            data={runHistory}
            series={chartSeries}
            height={300}
          />
        ) : (
          <p className="text-text-muted text-sm font-mono text-center py-8">
            No history data for this run.
          </p>
        )}
      </Modal>
    </div>
  );
}
