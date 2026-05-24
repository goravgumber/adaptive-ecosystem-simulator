import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { formatPop } from "../../utils/format";

export default function LineChart({ data = [], series = [], height = 280 }) {
  if (!data.length) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`gradient-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={s.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke="#1C2E1C" strokeDasharray="3 3" vertical={false} />
        <XAxis
          stroke="#4D7A4D"
          tick={{ fill: "#4D7A4D", fontSize: 11, fontFamily: "JetBrains Mono" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          stroke="#4D7A4D"
          tick={{ fill: "#4D7A4D", fontSize: 11, fontFamily: "JetBrains Mono" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatPop}
        />
        <Tooltip
          contentStyle={{
            background: "#0D1A0D",
            border: "1px solid #1C2E1C",
            borderRadius: "8px",
            color: "#E8F5E8",
            fontSize: "12px",
            fontFamily: "JetBrains Mono",
          }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", color: "#A3C4A3" }} />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            stroke={s.color}
            fill={`url(#gradient-${s.key})`}
            strokeWidth={2}
            dot={data.length < 20}
            name={s.label}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
