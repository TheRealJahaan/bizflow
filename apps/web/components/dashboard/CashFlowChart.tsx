"use client";
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface Props {
  data: Array<{ month: string; revenue: number; collected: number }>;
}

function formatINR(v: number) {
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v}`;
}

export default function CashFlowChart({ data }: Props) {
  const formatted = data.map((d) => ({
    ...d,
    label: d.month,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={formatted}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0d7a5f" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#0d7a5f" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="col" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1a6fc4" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#1a6fc4" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#9a9a9a" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatINR}
          tick={{ fontSize: 11, fill: "#9a9a9a" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(v: number) => formatINR(v)}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #e5e5e5",
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#0d7a5f"
          strokeWidth={2}
          fill="url(#rev)"
          name="Invoiced"
        />
        <Area
          type="monotone"
          dataKey="collected"
          stroke="#1a6fc4"
          strokeWidth={2}
          fill="url(#col)"
          name="Collected"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}