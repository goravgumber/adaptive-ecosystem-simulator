import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";

const severityColors = {
  info: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",
};

const severityFilters = ["all", "info", "warning", "error"];

function severityDot(color) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0 mt-1"
      style={{ backgroundColor: color }}
    />
  );
}

export default function LogBook() {
  const { authFetch } = useAuth();
  const [logs, setLogs] = useState([]);
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("all");
  const [pinned, setPinned] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (severity !== "all") params.set("level", severity);
      if (query.trim()) params.set("search", query.trim());
      const res = await authFetch(`/api/v1/logs?${params.toString()}`);
      const json = await res.json();
      const data = json.success && json.data ? json.data : json;
      setLogs(Array.isArray(data) ? data : data?.logs || []);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLoading(false);
    }
  }, [authFetch, severity, query]);

  useEffect(() => {
    const timer = setTimeout(fetchLogs, 300);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = new Blob([JSON.stringify(logs, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ecosim-logs-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handlePin = (entry) => {
    setPinned((p) =>
      p && p.createdAt === entry.createdAt ? null : entry
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-text-primary text-xl font-semibold font-mono">
          Logbook
        </h1>
        <Button variant="ghost" size="sm" onClick={handleExport} loading={exporting}>
          Export
        </Button>
      </div>

      <div className="flex gap-2">
        {severityFilters.map((f) => (
          <Button
            key={f}
            variant={severity === f ? "primary" : "ghost"}
            size="sm"
            onClick={() => setSeverity(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      <div className="flex gap-6">
        <div className="flex-1 space-y-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search logs..."
            className="w-full bg-elevated border border-border rounded text-text-primary font-mono text-sm px-3 py-2 focus:border-accent outline-none ring-1 ring-transparent focus:ring-accent/20 placeholder:text-text-muted"
          />

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} variant="block" height={64} />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <Card padding="p-8">
              <p className="text-text-muted text-sm font-mono text-center">
                No log entries found.
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {logs.map((entry) => {
                const color =
                  severityColors[entry.level] ||
                  severityColors[entry.severity] ||
                  "#22C55E";
                const level = entry.level || entry.severity || "info";
                const isExpanded = expanded === entry.createdAt;
                const hasData =
                  entry.data &&
                  (typeof entry.data === "object" ? Object.keys(entry.data).length > 0 : true);

                return (
                  <Card key={entry.createdAt || entry.id} padding="p-4">
                    <div className="flex gap-3">
                      {severityDot(color)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 text-text-muted font-mono text-xs">
                          <span className="uppercase">{level}</span>
                          <span>
                            {entry.createdAt
                              ? new Date(entry.createdAt).toLocaleString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })
                              : ""}
                          </span>
                        </div>
                        <p className="text-text-primary text-sm mt-1 break-words">
                          {entry.message}
                        </p>
                        {hasData && (
                          <button
                            onClick={() =>
                              setExpanded(isExpanded ? null : entry.createdAt)
                            }
                            className="text-text-muted hover:text-text-primary text-xs font-mono mt-1 transition"
                          >
                            {isExpanded ? "hide data" : "show data"}
                          </button>
                        )}
                        {isExpanded && hasData && (
                          <pre className="mt-2 p-2 bg-elevated border border-border rounded text-text-muted text-xs font-mono overflow-x-auto max-h-48">
                            {JSON.stringify(entry.data, null, 2)}
                          </pre>
                        )}
                      </div>
                      <button
                        onClick={() => handlePin(entry)}
                        title="Pin this entry"
                        className="shrink-0 border border-border hover:border-border-bright text-text-muted hover:text-text-primary hover:bg-elevated transition rounded p-1.5"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          viewBox="0 0 24 24"
                          fill={
                            pinned && pinned.createdAt === entry.createdAt
                              ? "currentColor"
                              : "none"
                          }
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                        </svg>
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="w-64 space-y-4 shrink-0">
          <Card title="Pinned">
            {pinned ? (
              <div className="space-y-2">
                <p className="text-text-muted font-mono text-xs">
                  {new Date(pinned.createdAt).toLocaleString()}
                </p>
                <p className="text-text-primary text-sm">{pinned.message}</p>
                <p className="text-text-muted text-xs font-mono uppercase">
                  {pinned.level || pinned.severity}
                </p>
              </div>
            ) : (
              <p className="text-text-muted text-sm font-mono">
                Pin important entries to view here.
              </p>
            )}
          </Card>

          <Card title="Quick actions">
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center"
                onClick={handleExport}
                loading={exporting}
              >
                Download JSON
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center"
                onClick={() => {
                  navigator.clipboard.writeText(
                    JSON.stringify(logs.slice(0, 50), null, 2)
                  );
                }}
              >
                Copy recent 50
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
