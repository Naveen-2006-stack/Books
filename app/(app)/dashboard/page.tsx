import { getDashboardOverview } from "@/lib/data/dashboard";
import { CashflowChart } from "@/components/dashboard/cashflow-chart";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RecentInvoices } from "@/components/dashboard/recent-invoices";
import { TopExpenses } from "@/components/dashboard/top-expenses";

function formatCurrency(currency: string, value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export default async function DashboardPage() {
  const overview = await getDashboardOverview();

  return (
    <div className="space-y-6 animate-[fade-up_0.7s_ease_both]">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-white/80 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-900 px-6 py-7 text-white shadow-[0_28px_90px_rgba(15,23,42,0.24)] sm:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(45,212,191,0.24),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(251,191,36,0.18),_transparent_24%)]" />
        <div className="relative grid gap-5 lg:grid-cols-[1.4fr_0.9fr] lg:items-end">
          <div>
            <p className="mb-3 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-100">
              Operational overview
            </p>
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">A cleaner, richer bookkeeping cockpit for your daily decisions.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200/90">
              High-contrast panels, glass surfaces, and motion accents make every metric easier to scan while keeping the interface calm under pressure.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Focus</p>
              <p className="mt-2 text-lg font-semibold">Cash clarity</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Mode</p>
              <p className="mt-2 text-lg font-semibold">Fast scan</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Status</p>
              <p className="mt-2 text-lg font-semibold">Live</p>
            </div>
          </div>
        </div>
      </section>

      {overview.error ? (
        <div className="rounded-2xl border border-amber-200/70 bg-amber-50/90 px-4 py-3 text-sm text-amber-900 shadow-sm">{overview.error}</div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overview.kpis.map((kpi) => (
          <KpiCard key={kpi.title} title={kpi.title} value={formatCurrency(overview.currency, kpi.value)} delta={kpi.delta} trend={kpi.trend} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <CashflowChart currency={overview.currency} data={overview.cashflow} />
        </div>
        <TopExpenses currency={overview.currency} expenses={overview.topExpenses} />
      </section>

      <section>
        <RecentInvoices currency={overview.currency} invoices={overview.recentInvoices} />
      </section>
    </div>
  );
}
