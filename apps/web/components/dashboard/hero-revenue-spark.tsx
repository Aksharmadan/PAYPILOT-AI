"use client";

import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import { formatINR } from "@/lib/format";

// Synthetic sparkline data based on a smooth upward trend with natural variance
const SPARK_DATA = [
  { v: 420 }, { v: 445 }, { v: 438 }, { v: 462 }, { v: 471 },
  { v: 458 }, { v: 490 }, { v: 502 }, { v: 488 }, { v: 521 },
  { v: 534 }, { v: 518 }, { v: 545 }, { v: 558 }, { v: 572 },
  { v: 561 }, { v: 590 }, { v: 612 }, { v: 598 }, { v: 634 },
];

interface Props {
  className?: string;
}

export function HeroRevenueSpark({ className }: Props) {
  return (
    <div className={className} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={SPARK_DATA} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="heroSparkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C08A" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#22C08A" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke="#34E8A0"
            strokeWidth={1.5}
            fill="url(#heroSparkGrad)"
            dot={false}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
