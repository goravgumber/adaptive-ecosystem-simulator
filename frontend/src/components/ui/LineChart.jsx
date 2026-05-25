import {
  LineChart as RechartsLineChart,
  Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts"

const defaultColors = ["#22C55E", "#60A5FA", "#F87171", "#F59E0B", "#A78BFA", "#34D399"]

export default function LineChart({
  data = [], 
  series = [], 
  height = 200,
  showDots = false,
  yFormatter = (v) => v >= 1000 ? (v / 1000).toFixed(0) + "K" : Math.round(v),
}) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-ink-muted text-xs font-mono">
        No data available
      </div>
    )
  }

  if (!series || series.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-ink-muted text-xs font-mono">
        No series configured
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid 
          stroke="#1A2E1A" 
          strokeDasharray="3 3"
          horizontal={true} 
          vertical={false}
        />
        <XAxis
          stroke="transparent"
          tick={{ fill: "#4D6B4D", fontSize: 11, fontFamily: "JetBrains Mono" }}
          tickLine={false} 
          axisLine={false}
        />
        <YAxis
          stroke="transparent"
          tick={{ fill: "#4D6B4D", fontSize: 11, fontFamily: "JetBrains Mono" }}
          tickLine={false} 
          axisLine={false}
          tickFormatter={yFormatter}
          width={45}
        />
        <Tooltip
          contentStyle={{
            background: "#0A1409", 
            border: "1px solid #243824",
            borderRadius: "6px", 
            fontSize: "12px",
            fontFamily: "JetBrains Mono", 
            color: "#E2F0E2",
            padding: "8px 12px", 
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)"
          }}
          formatter={(value) => [Math.round(value).toLocaleString(), undefined]}
          labelStyle={{ color: "#8FAF8F", marginBottom: "4px" }}
        />
        {series.map((s, i) => (
          <Line
            key={s.key || i}
            type="monotone"
            dataKey={s.key}
            stroke={s.color || defaultColors[i % defaultColors.length]}
            strokeWidth={1.5}
            dot={showDots ? { r: 2.5, fill: s.color } : false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            strokeDasharray={s.dashed ? "4 4" : undefined}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}
