export const COLORS = {
  plant: "#10D98C",
  herb:  "#818CF8",
  carn:  "#F87171",
  cyan:  "#00C8E8",
  amber: "#F59E0B",
}

export const gridProps = {
  stroke: "#1E2040",
  strokeDasharray: "3 3",
  vertical: false,      // NO vertical grid lines — cleaner
  horizontal: true,
}

export const axisProps = {
  stroke: "transparent",
  tick: { fill: "#4A4F7A", fontSize: 11, fontFamily: "JetBrains Mono" },
  tickLine: false,
  axisLine: false,
}

export const tooltipStyle = {
  contentStyle: {
    background: "#11111F",
    border: "1px solid #2A2D52",
    borderRadius: "6px",
    fontSize: "12px",
    fontFamily: "JetBrains Mono",
    color: "#F0F2FF",
    padding: "8px 12px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
  },
  labelStyle: { color: "#8B90C4", marginBottom: "4px", fontSize: "11px" },
  itemStyle: { padding: "2px 0" },
}

export const legendStyle = {
  wrapperStyle: {
    fontSize: "11px",
    color: "#8B90C4",
    fontFamily: "JetBrains Mono",
    paddingTop: "12px",
  },
  iconType: "circle",
  iconSize: 6,
}

// Y-axis formatter — no scientific notation
export function yFmt(v) {
  if (v >= 1000000) return (v/1000000).toFixed(1)+"M"
  if (v >= 10000) return (v/1000).toFixed(0)+"K"
  if (v >= 1000) return (v/1000).toFixed(1)+"K"
  return Math.round(v)
}

// Tooltip formatter — whole numbers only
export function tFmt(v) { 
  return Math.round(v).toLocaleString() 
}