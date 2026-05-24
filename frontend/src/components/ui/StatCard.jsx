import Card from "./Card";

export default function StatCard({ label, value, delta, unit = "" }) {
  const deltaDisplay =
    delta > 0 ? (
      <span className="text-accent text-xs">↑ +{delta}</span>
    ) : delta < 0 ? (
      <span className="text-danger text-xs">↓ {delta}</span>
    ) : delta === 0 ? (
      <span className="text-text-muted text-xs">→ 0</span>
    ) : null;

  return (
    <Card padding="p-4">
      <p className="text-text-muted text-xs font-mono uppercase tracking-wider">{label}</p>
      <p className="text-text-primary text-2xl font-mono font-medium">
        {typeof value === "number" ? value.toLocaleString() : value}
        {unit && <span className="text-text-muted text-base ml-1">{unit}</span>}
      </p>
      {deltaDisplay && <div className="mt-1">{deltaDisplay}</div>}
    </Card>
  );
}
