import Card from "./Card.jsx"

export default function StatCard({ label, value, sub, trend }) {
  return (
    <Card padding="md">
      <p className="text-2xs font-mono text-lo uppercase tracking-[0.08em] mb-2">
        {label}
      </p>
      <p className="text-2xl font-mono text-hi font-medium leading-none">
        {value}
      </p>
      {sub && (
        <p className="text-xs text-lo mt-1 font-mono">
          {sub}
        </p>
      )}
      {trend && (
        <p className={`mt-2 text-xs font-mono ${
          trend.direction === "up" ? "text-ok" : 
          trend.direction === "down" ? "text-danger" : 
          "text-lo"
        }`}>
          {trend.direction === "up" ? "↑ +" : trend.direction === "down" ? "↓ " : "— "}{trend.value}
        </p>
      )}
    </Card>
  )
}
