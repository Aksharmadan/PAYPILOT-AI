"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Legend,
} from "recharts";
import { formatINR } from "@/lib/format";

interface ImpactData {
  total_recovered: number;
  total_attempts: number;
  successful_attempts: number;
  total_at_risk: number;
  organic_baseline: number;
  incremental_lift: number;
  automation_rate: number;
  avg_time_to_recovery_hours: number | null;
}

interface CalibrationBucket {
  bucket: string;
  predicted_probability: number | null;
  actual_recovery_rate: number | null;
  sample_size: number;
}

const CUSTOM_TOOLTIP_STYLE = {
  background: "rgba(10,11,14,0.9)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "10px",
  padding: "10px 14px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={CUSTOM_TOOLTIP_STYLE}>
      <p className="text-[10px] font-mono uppercase tracking-wide text-ink-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-sm font-semibold" style={{ color: p.color }}>
          {typeof p.value === "number" && p.value > 1000 ? formatINR(p.value) : `${(p.value * 100).toFixed(1)}%`}
        </p>
      ))}
    </div>
  );
}

export function ImpactBarChart({ data }: { data: ImpactData }) {
  const chartData = [
    { name: "Total at Risk", value: data.total_at_risk, fill: "#FF8177" },
    { name: "Organic Baseline", value: data.organic_baseline, fill: "#FBC66B" },
    { name: "Total Recovered", value: data.total_recovered, fill: "#22C08A" },
    { name: "Incremental Lift", value: data.incremental_lift, fill: "#34E8A0" },
  ];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
        <defs>
          <linearGradient id="barJade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34E8A0" stopOpacity={1} />
            <stop offset="100%" stopColor="#22C08A" stopOpacity={0.7} />
          </linearGradient>
          <linearGradient id="barCoral" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF8177" stopOpacity={1} />
            <stop offset="100%" stopColor="#F0554C" stopOpacity={0.7} />
          </linearGradient>
          <linearGradient id="barAmber" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FBC66B" stopOpacity={1} />
            <stop offset="100%" stopColor="#E8A23D" stopOpacity={0.7} />
          </linearGradient>
          <linearGradient id="barJadeBright" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34E8A0" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#4ADE94" stopOpacity={0.5} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: "#666", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => formatINR(v)}
          tick={{ fill: "#555", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={70}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={900}>
          {chartData.map((entry, index) => (
            <Cell
              key={index}
              fill={
                index === 0 ? "url(#barCoral)" :
                index === 1 ? "url(#barAmber)" :
                index === 2 ? "url(#barJade)" :
                "url(#barJadeBright)"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CalibrationChart({ buckets }: { buckets: CalibrationBucket[] }) {
  const data = buckets.map((b) => ({
    name: b.bucket,
    predicted: b.predicted_probability ?? 0,
    actual: b.actual_recovery_rate ?? 0,
    n: b.sample_size,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
        <defs>
          <linearGradient id="calViolet" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9C93F5" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#7C6FF0" stopOpacity={0.5} />
          </linearGradient>
          <linearGradient id="calJade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34E8A0" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#22C08A" stopOpacity={0.4} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis
          tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
          tick={{ fill: "#555", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="predicted" name="Predicted" fill="url(#calViolet)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={800} />
        <Bar dataKey="actual" name="Actual" fill="url(#calJade)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={900} />
        <Legend
          formatter={(v) => <span style={{ fontSize: 11, color: "#888" }}>{v}</span>}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
