import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAccountingOverview } from "@/lib/data/accounting";

const money = (currency: string, value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);

export default async function ReportsPage() {
  const overview = await getAccountingOverview();

  if (overview.error) {
    return <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{overview.error}</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profit and Loss</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Income</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{money(overview.currency, overview.incomeBalance)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Expenses</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{money(overview.currency, overview.expenseBalance)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Net profit</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{money(overview.currency, overview.netIncome)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Balance Sheet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Assets</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{money(overview.currency, overview.assetBalance)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Liabilities</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{money(overview.currency, overview.liabilityBalance)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Equity</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{money(overview.currency, overview.equityBalance)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
