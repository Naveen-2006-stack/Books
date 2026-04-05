import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTrialBalance } from "@/lib/data/accounting";

const money = (currency: string, value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);

export default async function TrialBalancePage() {
  const result = await getTrialBalance();

  if (result.error) {
    return <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{result.error}</div>;
  }

  const balanced = Math.abs(result.totals.debit - result.totals.credit) < 0.01;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Trial Balance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`rounded-lg px-4 py-3 text-sm ${balanced ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
            {balanced ? "Debits and credits are balanced." : "Debits and credits are out of balance."}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2">Account</th>
                  <th className="pb-2 text-right">Debit</th>
                  <th className="pb-2 text-right">Credit</th>
                  <th className="pb-2 text-right">Net</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.accountId} className="border-b border-slate-100">
                    <td className="py-3">
                      <div className="font-medium text-slate-900">{row.code}</div>
                      <div className="text-xs text-slate-500">{row.name}</div>
                    </td>
                    <td className="py-3 text-right text-slate-700">{money(result.currency, row.debit)}</td>
                    <td className="py-3 text-right text-slate-700">{money(result.currency, row.credit)}</td>
                    <td className="py-3 text-right font-medium text-slate-900">{money(result.currency, row.balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 font-semibold text-slate-900">
                  <td className="py-3">Total</td>
                  <td className="py-3 text-right">{money(result.currency, result.totals.debit)}</td>
                  <td className="py-3 text-right">{money(result.currency, result.totals.credit)}</td>
                  <td className="py-3 text-right">{money(result.currency, result.totals.balance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}