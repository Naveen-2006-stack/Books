"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  currency: string;
  data: Array<{ month: string; income: number; expense: number }>;
};

function formatCurrency(currency: string, value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export function CashflowChart({ currency, data }: Props) {
  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-teal-500 via-cyan-400 to-amber-400" />
      <CardHeader>
        <CardTitle>Cashflow (Last 6 Months)</CardTitle>
        <CardDescription>Income vs Expense trend for operational planning.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: 8, right: 8, top: 12, bottom: 0 }}>
              <defs>
                <linearGradient id="income" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="5%" stopColor="#0f766e" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.06} />
                </linearGradient>
                <linearGradient id="expense" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="5%" stopColor="#be123c" stopOpacity={0.42} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.25)" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 16,
                  borderColor: "rgba(148, 163, 184, 0.35)",
                  background: "rgba(255,255,255,0.92)",
                  boxShadow: "0 18px 50px rgba(15, 23, 42, 0.14)",
                }}
                formatter={(value) => formatCurrency(currency, Number(value))}
              />
              <Area type="monotone" dataKey="income" stroke="#0f766e" fill="url(#income)" strokeWidth={2.5} />
              <Area type="monotone" dataKey="expense" stroke="#be123c" fill="url(#expense)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
