import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type KpiCardProps = {
  title: string;
  value: string;
  delta: string;
  trend: "up" | "down";
};

export function KpiCard({ title, value, delta, trend }: KpiCardProps) {
  const isUp = trend === "up";

  return (
    <Card className="group">
      <div className="h-1 bg-gradient-to-r from-teal-500 via-emerald-400 to-amber-400 opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
      <CardHeader className="relative">
        <CardTitle>{title}</CardTitle>
        <div className="absolute right-5 top-5 h-10 w-10 rounded-2xl bg-slate-950/5 opacity-0 blur-sm transition-opacity duration-300 group-hover:opacity-100" />
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
        <p
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            isUp ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
          }`}
        >
          {isUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {delta}
        </p>
      </CardContent>
    </Card>
  );
}
