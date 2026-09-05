"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, TrendingUp, TrendingDown, Sparkles, CornerDownRight, ShieldAlert, Zap, Globe, BarChart2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatINR } from "@/lib/format";
import type { RootCauseAnalysis } from "@/lib/api";

const WINDOWS = [
  { label: "7d", value: 7 },
  { label: "14d", value: 14 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

const TOOLTIP_STYLE = {
  background: "rgba(10,11,14,0.92)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "10px",
  padding: "8px 12px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
  fontSize: 11,
  color: "#ccc",
};

function FactorIcon({ type }: { type: string }) {
  switch (type) {
    case "payment_failure":
      return <ShieldAlert size={13} className="text-coral-400" />;
    case "abandonment":
      return <Zap size={13} className="text-amber-400" />;
    case "volume":
      return <Globe size={13} className="text-sky-400" />;
    default:
      return <BarChart2 size={13} className="text-violet-400" />;
  }
}

export function RootCauseAnalyzer({ initialData }: { initialData: RootCauseAnalysis }) {
  const [data, setData] = useState<RootCauseAnalysis>(initialData);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);

  const handleWindowChange = async (val: number) => {
    setDays(val);
    setLoading(true);
    try {
      const res = await fetch(`/api/proxy?path=${encodeURIComponent(`/revenue/root-cause?days=${val}`)}`);
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error("Failed to load root cause analysis:", err);
    } finally {
      setLoading(false);
    }
  };

  const isPositive = data.revenue_change_pct >= 0;

  // Recharts data for the factor breakdown bar chart
  const chartData = data.factors.map((f) => ({
    name: f.factor.length > 20 ? f.factor.substring(0, 18) + "…" : f.factor,
    fullName: f.factor,
    weight: Math.round(f.impact_weight * 100),
    direction: f.impact_direction,
    change: f.change,
  }));

  return (
    <section className="card-surface rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-base-border pb-3">
        <div className="flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <defs>
              <linearGradient id="sparkRootGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7C6FF0" />
                <stop offset="100%" stopColor="#B8A8FF" />
              </linearGradient>
            </defs>
            <path d="M7.5 1L8.9 5.6L13.5 7L8.9 8.4L7.5 13L6.1 8.4L1.5 7L6.1 5.6L7.5 1Z" stroke="url(#sparkRootGrad)" strokeWidth="1.1" fill="none" strokeLinejoin="round" />
          </svg>
          <h3 className="text-sm font-medium text-ink-0">Revenue Change Decomposition</h3>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-base-200/60 p-1">
          {WINDOWS.map((w) => (
            <button
              key={w.value}
              type="button"
              onClick={() => handleWindowChange(w.value)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                days === w.value
                  ? "bg-base-100 text-ink-0 shadow-sm border border-base-border"
                  : "text-ink-400 hover:text-ink-200"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <div key="loader" className="flex h-52 items-center justify-center gap-2 text-ink-400">
            <RefreshCw size={16} className="animate-spin text-violet-400" />
            <span className="text-xs">Analyzing {days}d cohort...</span>
          </div>
        ) : (
          <motion.div
            key={`${days}-${data.revenue_change_pct}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            {/* Summary pill */}
            <div className="flex items-center justify-between gap-4 rounded-lg bg-base-50/40 border border-base-border/40 px-4 py-3">
              <p className="text-xs text-ink-300 leading-relaxed">
                {data.summary_sentence}
              </p>
              <div className="shrink-0">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                  isPositive
                    ? "bg-jade-500/10 text-jade-300 border-jade-500/20"
                    : "bg-coral-500/10 text-coral-300 border-coral-500/20"
                }`}>
                  {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {isPositive ? "+" : ""}{data.revenue_change_pct.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Recharts bar chart of factor weights */}
            {chartData.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-ink-500 uppercase tracking-wide">Factor Contribution</p>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 0, right: 10, bottom: 0, left: 8 }}
                  >
                    <defs>
                      <linearGradient id="barNegGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#F0554C" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#FF8177" stopOpacity={0.6} />
                      </linearGradient>
                      <linearGradient id="barPosGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#22C08A" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#34E8A0" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.03)" />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fill: "#555", fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: "#777", fontSize: 9 }}
                      axisLine={false}
                      tickLine={false}
                      width={90}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(val: any, _: any, props: any): [string, string] => [
                        `${val ?? 0}% impact weight`,
                        props?.payload?.fullName ?? "",
                      ]}
                      cursor={{ fill: "rgba(255,255,255,0.02)" }}
                    />
                    <Bar
                      dataKey="weight"
                      radius={[0, 4, 4, 0]}
                      isAnimationActive
                      animationDuration={900}
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.direction === "negative" ? "url(#barNegGrad)" : "url(#barPosGrad)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Factor cards */}
            <div className="space-y-2.5">
              <p className="text-[10px] text-ink-500 uppercase tracking-wide">Breakdown</p>
              {data.factors.slice(0, 3).map((f) => (
                <div
                  key={f.factor}
                  className="flex items-start gap-3 rounded-lg border border-base-border bg-base-50/20 px-3 py-2.5"
                >
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-base-200 border border-base-border">
                    <FactorIcon type={f.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-ink-0 truncate">{f.factor}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                        f.impact_direction === "negative"
                          ? "text-coral-400 bg-coral-500/5 border-coral-500/15"
                          : "text-jade-400 bg-jade-500/5 border-jade-500/15"
                      }`}>
                        {f.change}
                      </span>
                    </div>
                    <p className="text-[10px] text-ink-400 mt-0.5 leading-relaxed line-clamp-2 flex gap-1">
                      <CornerDownRight size={10} className="mt-0.5 shrink-0 text-ink-600" />
                      {f.explanation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
