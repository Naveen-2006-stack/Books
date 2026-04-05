import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getJournalLedger } from "@/lib/data/accounting";

const money = (currency: string, value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);

export default async function JournalPage() {
  const result = await getJournalLedger();

  if (result.error) {
    return <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{result.error}</div>;
  }

  return (
    <div className="space-y-4">
      {result.rows.map((entry) => (
        <Card key={entry.id}>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Entry #{entry.entryNumber}</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                {entry.sourceType} · {new Date(entry.entryDate).toLocaleDateString()} · {entry.memo ?? "No memo"}
              </p>
            </div>
            <div className="text-right text-sm text-slate-500">
              <p>Dr {money(result.currency, entry.totalDebit)}</p>
              <p>Cr {money(result.currency, entry.totalCredit)}</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-2">Account</th>
                    <th className="pb-2">Description</th>
                    <th className="pb-2 text-right">Debit</th>
                    <th className="pb-2 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.lines.map((line) => (
                    <tr key={line.lineNo} className="border-b border-slate-100">
                      <td className="py-2">
                        <div className="font-medium text-slate-900">{line.accountCode}</div>
                        <div className="text-xs text-slate-500">{line.accountName}</div>
                      </td>
                      <td className="py-2 text-slate-700">{line.description ?? entry.memo ?? "-"}</td>
                      <td className="py-2 text-right text-slate-700">{money(result.currency, line.debit)}</td>
                      <td className="py-2 text-right text-slate-700">{money(result.currency, line.credit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}