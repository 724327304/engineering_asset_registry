"use client";

import { useMemo } from "react";
import type { TrendPoint } from "@/lib/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  title: string;
  data: TrendPoint[];
  color?: string;
  loading?: boolean;
}

export function TrendChart({ title, data, color = "#6366f1", loading }: Props) {
  const chartData = useMemo(() => {
    return data.map((p) => {
      const parts = p.date.split("-");
      return {
        label:
          parts.length === 3
            ? `${parseInt(parts[1], 10)?.toString() ?? parts[1]}/${parseInt(parts[2], 10)?.toString() ?? parts[2]}`
            : p.date,
        count: p.count,
      };
    });
  }, [data]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-700">{title}</h3>
        <div className="flex h-64 items-center justify-center text-sm text-slate-400">
          加载中...
        </div>
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-700">{title}</h3>
        <div className="flex h-64 items-center justify-center text-sm text-slate-400">
          暂无数据
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">{title}</h3>
      <ResponsiveContainer width="100%" height={256}>
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={48}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            }}
            formatter={(value: unknown) => {
              const n = Number(value);
              return [Number.isFinite(n) ? n.toLocaleString("zh-CN") : "0", "数量"] as [string, string];
            }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 2, fill: color }}
            activeDot={{ r: 4, fill: color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}