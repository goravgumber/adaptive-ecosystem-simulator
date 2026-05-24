import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import Badge from "../components/ui/Badge";
import Card from "../components/ui/Card";
import StatCard from "../components/ui/StatCard";
import Button from "../components/ui/Button";
import { simAPI } from "../services/api";
import { formatPop } from "../utils/format";

const BACKEND_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

const COLORS = {
  plants: "#4ADE80",
  herbivores: "#60A5FA",
  carnivores: "#F87171",
};

const SPEED_MAP = {
  slow: 2000,
  normal: 1000,
  fast: 300,
};

const SPEED_LABELS = [
  { key: "slow", label: "Slow" },
  { key: "normal", label: "Normal" },
  { key: "fast", label: "Fast" },
];

export default function Simulation() {
  const [state, setState] = useState({ plants: 1000, herbivores: 200, carnivores: 50, tick: 0 });
  const [prevState, setPrevState] = useState(null);
  const [history, setHistory] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1000);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(BACKEND_URL, {
      transports: ["websocket"],
      auth: { token: localStorage.getItem("token") },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      Promise.all([
        simAPI.status(),
        simAPI.history(),
      ]).then(([statusRes, historyRes]) => {
        if (statusRes.data) {
          setIsRunning(statusRes.data.isRunning);
          setSpeed(statusRes.data.speed || 1000);
          if (statusRes.data.tick) {
            setState((prev) => ({ ...prev, tick: statusRes.data.tick }));
          }
        }
        if (historyRes.data?.length) {
          setHistory(historyRes.data.slice(-149));
        }
      }).catch(() => {});
    });

    socket.on("tick:update", (data) => {
      const norm = {
        plants: data.plants,
        herbivores: data.herbivores,
        carnivores: data.carnivores,
        tick: data.tick ?? data.step ?? 0,
      };
      setPrevState((p) => p || norm);
      setState(norm);
      setHistory((h) => [...h.slice(-149), {
        step: norm.tick,
        plants: data.plants,
        herbivores: data.herbivores,
        carnivores: data.carnivores,
      }]);
      if (!startTime) setStartTime(Date.now());
    });

    socket.on("simulation-toggle", (data) => {
      setIsRunning(data.isRunning);
      if (data.isRunning) setStartTime(Date.now());
    });
    socket.on("simulation-speed", (data) => setSpeed(data.speed));

    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 100);
    }, 100);
    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning) setElapsed(0);
  }, [isRunning]);

  const handleToggle = () => {
    simAPI.toggle().catch(() => {});
  };

  const handleReset = () => {
    setHistory([]);
    setPrevState(null);
    setStartTime(null);
    setElapsed(0);
    setState({ plants: 1000, herbivores: 200, carnivores: 50, tick: 0 });
    simAPI.reset().catch(() => {});
  };

  const handleSpeed = (key) => {
    const ms = SPEED_MAP[key];
    setSpeed(ms);
    simAPI.speed(ms).catch(() => {});
  };

  const currentSpeedKey = Object.entries(SPEED_MAP).find(([, v]) => v === speed)?.[0] || "normal";

  const deltas = prevState ? {
    plants: state.plants - prevState.plants,
    herbivores: state.herbivores - prevState.herbivores,
    carnivores: state.carnivores - prevState.carnivores,
  } : { plants: 0, herbivores: 0, carnivores: 0 };

  const total = state.plants + state.herbivores + state.carnivores;

  const maxPop = Math.max(state.plants, state.herbivores, state.carnivores);
  const dominant = maxPop === state.plants ? "Plants" : maxPop === state.herbivores ? "Herbivores" : "Carnivores";

  return (
    <div className="space-y-4 p-4 bg-base min-h-screen animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-text-primary text-xl font-sans font-semibold">Live Simulation</h1>
          <Badge variant="neutral">TICK {(state.tick ?? 0).toLocaleString()}</Badge>
        </div>
      </div>

      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-surface border border-border rounded-lg p-0.5">
          {SPEED_LABELS.map(({ key, label }) => (
            <button key={key}
              onClick={() => handleSpeed(key)}
              className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors ${
                currentSpeedKey === key
                  ? "bg-accent-muted text-accent border border-accent/30"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant={isRunning ? "ghost" : "primary"} onClick={handleToggle}>
            {isRunning ? "Pause" : "Start"}
          </Button>
          <Button variant="danger" onClick={handleReset}>Reset</Button>
        </div>
      </div>

      {/* Main chart */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-text-muted font-mono text-xs tracking-widest">POPULATION DYNAMICS</p>
          <span className="text-accent font-mono text-xs">TICK {(state.tick ?? 0).toLocaleString()}</span>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={history} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <defs>
              {Object.entries(COLORS).map(([key, color]) => (
                <linearGradient key={key} id={`sim-grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke="#1C2E1C" strokeOpacity={0.6} />
            <XAxis dataKey="step" tick={{ fill: "#4D7A4D", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => formatPop(v)} tick={{ fill: "#4D7A4D", fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: "#0D1A0D",
                border: "1px solid #1C2E1C",
                borderRadius: "8px",
                color: "#E8F5E8",
                fontFamily: "JetBrains Mono",
                fontSize: "12px",
              }}
              labelFormatter={(l) => `Tick ${l}`}
            />
            {Object.entries(COLORS).map(([key, color]) => (
              <Area key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={2}
                fill={`url(#sim-grad-${key})`} dot={false} name={key.charAt(0).toUpperCase() + key.slice(1)} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Current Tick" value={state.tick} />
        <StatCard label="Elapsed Time" value={formatDuration(elapsed)} />
        <StatCard label="Status" value={isRunning ? "Running" : "Paused"} />
        <StatCard label="Dominant Species" value={dominant} />
      </div>

      {/* Population table */}
      <Card>
        <p className="text-text-muted font-mono text-xs tracking-widest mb-3">POPULATION TABLE</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-text-muted text-xs font-normal pb-2">Species</th>
                <th className="text-right text-text-muted text-xs font-normal pb-2">Current</th>
                <th className="text-right text-text-muted text-xs font-normal pb-2">Change</th>
                <th className="text-right text-text-muted text-xs font-normal pb-2">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {[
                { species: "Plants", color: "text-plants", value: state.plants, delta: deltas.plants },
                { species: "Herbivores", color: "text-herbivores", value: state.herbivores, delta: deltas.herbivores },
                { species: "Carnivores", color: "text-carnivores", value: state.carnivores, delta: deltas.carnivores },
              ].map(({ species, color, value, delta }) => (
                <tr key={species} className="border-b border-border last:border-0">
                  <td className={`py-2 ${color}`}>{species}</td>
                  <td className="py-2 text-right text-text-primary">{formatPop(value)}</td>
                  <td className={`py-2 text-right ${delta > 0 ? "text-accent" : delta < 0 ? "text-danger" : "text-text-muted"}`}>
                    {delta === 0 ? "\u2014" : `${delta > 0 ? "+" : ""}${formatPop(delta)}`}
                  </td>
                  <td className="py-2 text-right text-text-secondary">
                    {total > 0 ? ((value / total) * 100).toFixed(1) + "%" : "\u2014"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function formatDuration(ms) {
  if (!ms) return "0s";
  const s = Math.floor(ms / 1000);
  if (s < 60) return s + "s";
  if (s < 3600) return Math.floor(s / 60) + "m " + (s % 60) + "s";
  return Math.floor(s / 3600) + "h " + Math.floor((s % 3600) / 60) + "m";
}
