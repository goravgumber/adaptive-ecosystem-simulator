import { useState, useEffect } from "react";
import { useSimulation } from "../context/SimulationContext";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";
import { userAPI } from "../services/api";

const speedOptions = [
  { label: "Slow", value: 1000 },
  { label: "Normal", value: 500 },
  { label: "Fast", value: 200 },
  { label: "Ultra", value: 50 },
];

const inputClass =
  "bg-elevated border border-border rounded text-text-primary font-mono text-sm px-3 py-2 focus:border-accent outline-none ring-1 ring-transparent focus:ring-accent/20 placeholder:text-text-muted w-full";

function Toggle({ active, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${
        active ? "bg-accent" : "bg-elevated border border-border"
      }`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 bg-text-primary rounded-full transition-transform ${
          active ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function Settings() {
  const { settings, updateSettings, setSpeed } = useSimulation();

  const [form, setForm] = useState(settings);
  const [display, setDisplay] = useState(() => {
    const saved = localStorage.getItem("simulationDisplay");
    return saved
      ? JSON.parse(saved)
      : { autoRefresh: 10000, showTicks: true, numberFormat: "abbreviated" };
  });
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem("simulationNotifications");
    return saved
      ? JSON.parse(saved)
      : { collapseRisk: true, extinctionRisk: true };
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  useEffect(() => {
    const loadSettings = async () => {
      const res = await userAPI.getSettings();
      if (res.data?.settings) {
        const s = res.data.settings;
        setForm((prev) => ({
          ...prev,
          plants: s.defaultPlants,
          herbivores: s.defaultHerbivores,
          carnivores: s.defaultCarnivores,
          speed: ({ slow: 1000, normal: 500, fast: 200, ultra: 50 }[s.defaultSpeed]) || 500,
        }));
        setDisplay((prev) => ({
          ...prev,
          autoRefresh: (s.autoRefreshInterval || 10) * 1000,
          showTicks: s.showTickNumbers,
          numberFormat: s.numberFormat === "full" ? "full" : "abbreviated",
        }));
        setNotifications((prev) => ({
          ...prev,
          collapseRisk: s.alertOnCollapseRisk,
          extinctionRisk: s.alertOnExtinction,
        }));
      }
      setLoading(false);
    };
    loadSettings();
  }, []);

  const updateDisplay = (patch) => {
    const next = { ...display, ...patch };
    setDisplay(next);
    localStorage.setItem("simulationDisplay", JSON.stringify(next));
  };

  const updateNotifications = (patch) => {
    const next = { ...notifications, ...patch };
    setNotifications(next);
    localStorage.setItem("simulationNotifications", JSON.stringify(next));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: Number(value) }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);

    updateSettings(form);
    localStorage.setItem("simulationDisplay", JSON.stringify(display));
    localStorage.setItem("simulationNotifications", JSON.stringify(notifications));

    const backendSettings = {
      defaultPlants: form.plants,
      defaultHerbivores: form.herbivores,
      defaultCarnivores: form.carnivores,
      defaultSpeed: ({ 1000: "slow", 500: "normal", 200: "fast", 50: "ultra" }[form.speed]) || "normal",
      autoRefreshInterval: Math.round(display.autoRefresh / 1000),
      showTickNumbers: display.showTicks,
      numberFormat: display.numberFormat === "full" ? "full" : "abbreviated",
      alertOnCollapseRisk: notifications.collapseRisk,
      alertOnExtinction: notifications.extinctionRisk,
    };

    const res = await userAPI.saveSettings(backendSettings);
    if (res.data) {
      setStatus({ type: "success", message: "Settings saved" });
    } else {
      setStatus({ type: "error", message: res.error || "Failed to save settings" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton height="1.5rem" width="8rem" />
        <Skeleton variant="block" height={320} />
        <Skeleton variant="block" height={200} />
        <Skeleton variant="block" height={160} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-text-primary text-xl font-semibold font-mono">
        Settings
      </h1>

      {status && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${
          status.type === "success"
            ? "border-accent/30 bg-accent/5 text-accent"
            : "border-danger/30 bg-danger/5 text-danger"
        }`}>
          {status.message}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <Card title="SIMULATION DEFAULTS">
          <div className="space-y-4">
            <div>
              <label className="block text-text-muted text-xs font-mono uppercase tracking-wider mb-1.5">
                Starting Plants
              </label>
              <input
                type="number"
                name="plants"
                value={form.plants}
                onChange={handleNumberChange}
                className={inputClass}
                min="10"
              />
            </div>
            <div>
              <label className="block text-text-muted text-xs font-mono uppercase tracking-wider mb-1.5">
                Starting Herbivores
              </label>
              <input
                type="number"
                name="herbivores"
                value={form.herbivores}
                onChange={handleNumberChange}
                className={inputClass}
                min="5"
              />
            </div>
            <div>
              <label className="block text-text-muted text-xs font-mono uppercase tracking-wider mb-1.5">
                Starting Carnivores
              </label>
              <input
                type="number"
                name="carnivores"
                value={form.carnivores}
                onChange={handleNumberChange}
                className={inputClass}
                min="2"
              />
            </div>
            <div>
              <label className="block text-text-muted text-xs font-mono uppercase tracking-wider mb-1.5">
                Speed
              </label>
              <div className="flex gap-2">
                {speedOptions.map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={form.speed === opt.value ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => setForm((prev) => ({ ...prev, speed: opt.value }))}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card title="DISPLAY">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-text-primary text-sm font-mono">
                Auto-refresh interval
              </span>
              <select
                value={display.autoRefresh}
                onChange={(e) =>
                  updateDisplay({ autoRefresh: Number(e.target.value) })
                }
                className="bg-elevated border border-border rounded text-text-primary font-mono text-sm px-3 py-2 focus:border-accent outline-none ring-1 ring-transparent focus:ring-accent/20"
              >
                <option value={5000}>5s</option>
                <option value={10000}>10s</option>
                <option value={30000}>30s</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-primary text-sm font-mono">
                Show tick numbers
              </span>
              <Toggle
                active={display.showTicks}
                onChange={() =>
                  updateDisplay({ showTicks: !display.showTicks })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-primary text-sm font-mono">
                Number format
              </span>
              <Toggle
                active={display.numberFormat === "compact"}
                onChange={() =>
                  updateDisplay({
                    numberFormat:
                      display.numberFormat === "compact" ? "full" : "compact",
                  })
                }
              />
            </div>
          </div>
        </Card>

        <Card title="NOTIFICATIONS">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-text-primary text-sm font-mono">
                Collapse risk &gt;70%
              </span>
              <Toggle
                active={notifications.collapseRisk}
                onChange={() =>
                  updateNotifications({
                    collapseRisk: !notifications.collapseRisk,
                  })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-primary text-sm font-mono">
                Extinction risk
              </span>
              <Toggle
                active={notifications.extinctionRisk}
                onChange={() =>
                  updateNotifications({
                    extinctionRisk: !notifications.extinctionRisk,
                  })
                }
              />
            </div>
          </div>
        </Card>

        <Button variant="primary" size="lg" className="w-full justify-center" loading={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </form>
    </div>
  );
}

export default Settings;
