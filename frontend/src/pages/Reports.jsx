import { useState, useEffect } from "react";
import { formatPop } from "../utils/format";
import { reportsAPI } from "../services/api";
import Card from "../components/ui/Card";
import StatCard from "../components/ui/StatCard";
import Button from "../components/ui/Button";
import LineChart from "../components/ui/LineChart";
import Skeleton from "../components/ui/Skeleton";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  ResponsiveContainer,
} from "recharts";

const PIE_COLORS = ["#4ADE80", "#60A5FA", "#F87171"];

const speciesSeries = [
  { key: "plants", color: "#4ADE80", label: "Plants" },
  { key: "herbivores", color: "#60A5FA", label: "Herbivores" },
  { key: "carnivores", color: "#F87171", label: "Carnivores" },
];

function Reports() {
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const result = await reportsAPI.summary();
        if (result.data) {
          const payload =
            result.data.success && result.data.data
              ? result.data.data
              : result.data;
          setReportData(payload.data || []);
          setSummary(payload.summary || null);
        }
      } catch (err) {
        console.error("Failed to fetch reports:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const latestData =
    reportData.length > 0
      ? reportData[reportData.length - 1]
      : { plants: 0, herbivores: 0, carnivores: 0 };

  const pieData = [
    { name: "Plants", value: latestData.plants },
    { name: "Herbivores", value: latestData.herbivores },
    { name: "Carnivores", value: latestData.carnivores },
  ];

  const totalPop = pieData.reduce((s, d) => s + d.value, 0);
  const showPie = totalPop > 0 && pieData.every((d) => d.value < 100000);

  const handleExportCSV = () => {
    if (!reportData.length) return;
    const headers = "step,plants,herbivores,carnivores";
    const rows = reportData.map(
      (d) => `${d.step},${d.plants},${d.herbivores},${d.carnivores}`
    );
    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "ecosystem_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-text-primary text-xl font-semibold font-mono">
          Ecosystem Reports
        </h1>
        <Button variant="ghost" size="sm" onClick={handleExportCSV}>
          Export CSV
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} variant="block" height={90} />
              ))}
            </div>
          ))}
        </div>
      ) : summary ? (
        <>
          <div className="space-y-6">
            {["plants", "herbivores", "carnivores"].map((species) => (
              <div key={species}>
                <h3 className="text-text-secondary text-xs font-mono uppercase tracking-wider mb-2 capitalize">
                  {species}
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <StatCard
                    label="Average"
                    value={formatPop(summary.avg[species])}
                  />
                  <StatCard
                    label="Max"
                    value={formatPop(summary.max[species])}
                  />
                  <StatCard
                    label="Min"
                    value={formatPop(summary.min[species])}
                  />
                </div>
              </div>
            ))}
          </div>

          <Card padding="p-5">
            <h3 className="text-text-secondary text-xs font-mono uppercase tracking-wider mb-4">
              Population Over Time
            </h3>
            <LineChart data={reportData} series={speciesSeries} height={300} />
          </Card>

          <Card padding="p-5">
            <h3 className="text-text-secondary text-xs font-mono uppercase tracking-wider mb-4">
              Current Population Ratio
            </h3>
            {showPie ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ value }) => formatPop(value)}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <ReTooltip
                    contentStyle={{
                      background: "#0D1A0D",
                      border: "1px solid #1C2E1C",
                      borderRadius: "8px",
                      color: "#E8F5E8",
                      fontSize: "12px",
                      fontFamily: "JetBrains Mono",
                    }}
                    formatter={(value) => formatPop(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-text-muted text-sm font-mono">
                Collapsed ecosystem — ratio not meaningful
              </p>
            )}
          </Card>

          <Card padding="p-5">
            <h3 className="text-text-secondary text-xs font-mono uppercase tracking-wider mb-4">
              Trend Analysis
            </h3>
            <LineChart data={reportData} series={speciesSeries} height={300} />
          </Card>
        </>
      ) : (
        <Card padding="p-8">
          <p className="text-text-muted text-sm text-center font-mono">
            No report data available yet.
          </p>
        </Card>
      )}
    </div>
  );
}

export default Reports;
