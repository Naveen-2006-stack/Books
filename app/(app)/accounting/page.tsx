import Link from "next/link";
import { ArrowRight, BookOpenText, Landmark, ScrollText, Table2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAccountingOverview } from "@/lib/data/accounting";

const money = (currency: string, value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);

export default async function AccountingPage() {
  const overview = await getAccountingOverview();

  if (overview.error) {
    return <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{overview.error}</div>;
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Accounts</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{overview.accountCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Journal entries</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{overview.journalCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Assets</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{money(overview.currency, overview.assetBalance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-slate-500">Net income</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{money(overview.currency, overview.netIncome)}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Accounting views</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Chart of accounts, journal ledger, and trial balance.</p>
            </div>
            <BookOpenText className="h-5 w-5 text-slate-400" />
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Link href="/accounting/chart-of-accounts" className="rounded-xl border border-slate-200 p-4 transition-colors hover:border-slate-300 hover:bg-slate-50">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">Chart of accounts</p>
                  <p className="mt-1 text-sm text-slate-500">Review account balances and activity.</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </div>
            </Link>
            <Link href="/accounting/trial-balance" className="rounded-xl border border-slate-200 p-4 transition-colors hover:border-slate-300 hover:bg-slate-50">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">Trial balance</p>
                  <p className="mt-1 text-sm text-slate-500">Check that debits and credits stay aligned.</p>
                </div>
                <Table2 className="h-4 w-4 text-slate-400" />
              </div>
            </Link>
            <Link href="/accounting/journal" className="rounded-xl border border-slate-200 p-4 transition-colors hover:border-slate-300 hover:bg-slate-50">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">Journal ledger</p>
                  <p className="mt-1 text-sm text-slate-500">Inspect posted entries and line details.</p>
                </div>
                <ScrollText className="h-4 w-4 text-slate-400" />
              </div>
            </Link>
            <Link href="/reports" className="rounded-xl border border-slate-200 p-4 transition-colors hover:border-slate-300 hover:bg-slate-50">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">Reports</p>
                  <p className="mt-1 text-sm text-slate-500">P&amp;L, balance sheet, and summary views.</p>
                </div>
                <Landmark className="h-4 w-4 text-slate-400" />
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Posting health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="font-medium text-slate-900">Income</p>
              <p className="mt-1">Revenue posted through sales invoices and receipt entries.</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="font-medium text-slate-900">Controls</p>
              <p className="mt-1">Use the trial balance to confirm every journal remains balanced.</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent journal entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overview.recentJournals.length > 0 ? (
                overview.recentJournals.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">Entry #{entry.entryNumber}</p>
                        <p className="mt-1 text-sm text-slate-500">{entry.memo ?? entry.sourceType}</p>
                      </div>
                      <p className="text-sm text-slate-500">{new Date(entry.entryDate).toLocaleDateString()}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">{entry.sourceType}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">Dr {money(overview.currency, entry.totalDebit)}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">Cr {money(overview.currency, entry.totalCredit)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No journal entries yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trial balance preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-2">Account</th>
                    <th className="pb-2 text-right">Debit</th>
                    <th className="pb-2 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.trialBalancePreview.map((row) => (
                    <tr key={row.accountId} className="border-b border-slate-100">
                      <td className="py-2">
                        <div className="font-medium text-slate-900">{row.code}</div>
                        <div className="text-xs text-slate-500">{row.name}</div>
                      </td>
                      <td className="py-2 text-right text-slate-700">{money(overview.currency, row.debit)}</td>
                      <td className="py-2 text-right text-slate-700">{money(overview.currency, row.credit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
