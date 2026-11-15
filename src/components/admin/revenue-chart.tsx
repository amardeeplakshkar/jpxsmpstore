"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function RevenueChart({ data }: { data: { day: string; revenue: number; orders: number }[] }) {
  return (
    <div className="h-72 w-full" role="img" aria-label="Revenue over the last 30 days">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#29293B" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="day" stroke="#9494A8" fontSize={11} tickLine={false} axisLine={false} interval={4} />
          <YAxis stroke="#9494A8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v: number) => `₹${v}`} width={60} />
          <Tooltip
            contentStyle={{ background: "#191927", border: "1px solid #29293B", borderRadius: 8 }}
            labelStyle={{ color: "#F8FAFC" }}
            formatter={(value, name) => (name === "revenue" ? [`₹${Number(value).toFixed(2)}`, "Revenue"] : [value, "Orders"])}
          />
          <Area type="monotone" dataKey="revenue" stroke="#8B5CF6" strokeWidth={2} fill="url(#rev)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
