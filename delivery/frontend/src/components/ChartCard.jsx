import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import Card from "./Card";
import { useTheme } from "../context/ThemeContext";

const PALETTE = ["#7C5CFC", "#22B07D", "#3B82F6", "#F5A623", "#EC4899", "#22D3EE"];

function toRecords(chart) {
  if (chart.type === "pie") {
    return (chart.labels || []).map((label, i) => ({
      name: String(label),
      value: chart.values?.[i] ?? 0,
    }));
  }
  return (chart.x || []).map((x, i) => ({
    x: typeof x === "number" ? x : String(x),
    y: chart.y?.[i] ?? 0,
  }));
}

export default function ChartCard({ chart }) {
  const data = useMemo(() => toRecords(chart), [chart]);
  const truncated = chart.type !== "pie" && data.length > 30 ? data.slice(0, 30) : data;
  const { theme } = useTheme();
  const gridColor = theme === "dark" ? "rgba(255,255,255,0.08)" : "#E6E4F2";
  const tickColor = theme === "dark" ? "rgba(255,255,255,0.5)" : "#666B85";
  const tooltipStyle = {
    borderRadius: 10,
    borderColor: theme === "dark" ? "rgba(255,255,255,0.1)" : "#E6E4F2",
    background: theme === "dark" ? "#1B1830" : "#FFFFFF",
    color: theme === "dark" ? "#fff" : "#181A29",
    fontSize: 13,
  };

  return (
    <Card className="p-5 animate-fadeUp">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-ink dark:text-white">{chart.title}</h3>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint dark:text-white/40 bg-bg dark:bg-white/5 px-2 py-1 rounded-md">
          {chart.type}
        </span>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {chart.type === "bar" ? (
            <BarChart data={truncated} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="x"
                tick={{ fontSize: 11, fill: tickColor }}
                interval={0}
                angle={truncated.length > 6 ? -25 : 0}
                textAnchor={truncated.length > 6 ? "end" : "middle"}
                height={truncated.length > 6 ? 50 : 24}
              />
              <YAxis tick={{ fontSize: 11, fill: tickColor }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="y" fill="#7C5CFC" radius={[6, 6, 0, 0]} />
            </BarChart>
          ) : chart.type === "line" ? (
            <LineChart data={truncated} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="x" tick={{ fontSize: 11, fill: tickColor }} />
              <YAxis tick={{ fontSize: 11, fill: tickColor }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="y" stroke="#22B07D" strokeWidth={2.5} dot={false} />
            </LineChart>
          ) : (
            <PieChart>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12, color: tickColor }} />
              <Pie data={truncated} dataKey="value" nameKey="name" outerRadius={95} innerRadius={50}>
                {truncated.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
