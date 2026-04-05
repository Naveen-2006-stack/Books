import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getChartOfAccounts } from "@/lib/data/accounting";

const money = (currency: string, value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);

export default async function ChartOfAccountsPage() {
  const result = await getChartOfAccounts();

  if (result.error) {
    return <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{result.error}</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Chart of Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2">Code</th>
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2 text-right">Debit</th>
                  <th className="pb-2 text-right">Credit</th>
                  <th className="pb-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.accountId} className="border-b border-slate-100">
                    <td className="py-3 font-medium text-slate-900">{row.code}</td>
                    <td className="py-3 text-slate-700">
                      <div>{row.name}</div>
                      <div className="text-xs text-slate-500">{row.isActive ? "Active" : "Inactive"}</div>
                    </td>
                    <td className="py-3 text-slate-600">{row.category}</td>
                    <td className="py-3 text-right text-slate-700">{money(result.currency, row.debit)}</td>
                    <td className="py-3 text-right text-slate-700">{money(result.currency, row.credit)}</td>
                    <td className="py-3 text-right font-medium text-slate-900">{money(result.currency, row.balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 font-semibold text-slate-900">
                  <td className="py-3" colSpan={3}>
                    Total
                  </td>
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