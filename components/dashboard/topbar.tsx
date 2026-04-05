import { CalendarDays, Search, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function DashboardTopbar() {
  const currentLabel = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date());

  return (
    <header className="relative overflow-hidden border-b border-white/70 bg-gradient-to-r from-white/85 via-white/70 to-teal-50/70 p-5 shadow-sm lg:flex lg:items-center lg:justify-between lg:gap-6 lg:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.12),_transparent_30%),radial-gradient(circle_at_80%_0%,_rgba(180,83,9,0.1),_transparent_26%)]" />
      <div className="relative">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-teal-50/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-teal-800 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.12)]" />
          Live ledger
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">Financial Dashboard</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">A sharper command view for receivables, payables, cashflow, and the operational pulse of the business.</p>
      </div>
      <div className="relative mt-4 flex flex-wrap items-center gap-2 lg:mt-0">
        <Button variant="secondary" className="group gap-2">
          <Search className="h-4 w-4" />
          Search transactions
        </Button>
        <div className="inline-flex items-center gap-2 rounded-xl border border-white/80 bg-white/80 px-3 py-2 text-sm text-slate-700 shadow-sm backdrop-blur">
          <CalendarDays className="h-4 w-4" />
          {currentLabel}
        </div>
        <Badge variant="success" className="gap-1.5 px-3 py-1.5">
          <ShieldCheck className="h-3.5 w-3.5" />
          RLS Protected
        </Badge>
      </div>
    </header>
  );
}
