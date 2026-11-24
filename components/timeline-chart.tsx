"use client";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { timeline } from "@/lib/sentiment";
import type { AnalyzedCommit } from "@/lib/types";
export default function TimelineChart({
  commits,
  period,
}: {
  commits: AnalyzedCommit[];
  period: "week" | "month";
}) {
  const data = timeline(commits, period);
  return (
    <div
      className="chart"
      role="img"
      aria-label={`Linha do tempo com ${data.length} períodos; pontuação textual de -100 a 100`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 15, right: 12, left: -20, bottom: 5 }}
        >
          <defs>
            <linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b69aff" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#b69aff" stopOpacity={0.015} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="var(--line)"
            vertical={false}
            strokeDasharray="3 6"
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            minTickGap={30}
          />
          <YAxis
            domain={[-100, 100]}
            ticks={[-100, 0, 100]}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine y={0} stroke="var(--muted)" strokeDasharray="4 5" />
          <Tooltip
            contentStyle={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: 12,
              color: "var(--text)",
            }}
            formatter={(value) => [`${value} / 100`, "Tom médio"]}
            labelFormatter={(_, payload) => {
              const p = payload?.[0]?.payload;
              return p ? `${p.date} · ${p.count} commits` : "";
            }}
          />
          <Area
            type="linear"
            dataKey="score"
            stroke="#b69aff"
            strokeWidth={3}
            fill="url(#moodFill)"
            dot={{ r: 4, strokeWidth: 2, fill: "var(--panel)" }}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
