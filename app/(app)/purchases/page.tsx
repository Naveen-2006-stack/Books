import { BillCreateForm } from "@/components/forms/bill-create-form";
import { BillPaymentForm } from "@/components/forms/bill-payment-form";
import { ExpenseCreateForm } from "@/components/forms/expense-create-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPurchaseFormDependencies, getPurchasesOverview } from "@/lib/data/purchases";

function formatCurrency(currency: string, value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

const statusVariant: Record<string, "default" | "success" | "warning" | "danger"> = {
  draft: "default",
  sent: "warning",
  partially_paid: "warning",
  paid: "success",
  void: "danger",
  cancelled: "danger",
};

export default async function PurchasesPage() {
  const [overview, deps] = await Promise.all([getPurchasesOverview(), getPurchaseFormDependencies()]);

  return (
    <div className="space-y-5">
      {overview.error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{overview.error}</div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Outstanding Bills</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900">{formatCurrency(overview.summary.currency, overview.summary.outstandingBills)}</p>
            <p className="text-xs text-slate-500">Open vendor balance</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Monthly Spend</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900">{formatCurrency(overview.summary.currency, overview.summary.monthlySpend)}</p>
            <p className="text-xs text-slate-500">Cash outflow this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Overdue Bills</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900">{overview.summary.overdueBills}</p>
            <p className="text-xs text-slate-500">Bills past due date</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900">{overview.summary.activeVendors}</p>
            <p className="text-xs text-slate-500">Supplying current purchases</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Record Expense</CardTitle>
            <CardDescription>Capture out-of-pocket spending and post the ledger entry immediately.</CardDescription>
          </CardHeader>
          <CardContent>
            <ExpenseCreateForm vendors={deps.vendors} expenseAccounts={deps.expenseAccounts} paymentAccounts={deps.paymentAccounts} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Bill</CardTitle>
            <CardDescription>Record vendor invoices and post accounts payable when ready.</CardDescription>
          </CardHeader>
          <CardContent>
            <BillCreateForm vendors={deps.vendors} expenseAccounts={deps.expenseAccounts} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Recent Bills</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {overview.bills.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No bills recorded yet.</div>
            ) : (
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-2">Bill</th>
                    <th className="pb-2">Vendor</th>
                    <th className="pb-2">Bill Date</th>
                    <th className="pb-2">Due</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Total</th>
                    <th className="pb-2 text-right">Due</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.bills.map((bill) => {
                    const canPay = bill.amountDue > 0 && bill.status !== "void" && bill.status !== "cancelled";

                    return (
                      <tr key={bill.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="py-3 font-medium text-slate-900">{bill.billNumber}</td>
                        <td className="py-3 text-slate-700">{bill.vendorName}</td>
                        <td className="py-3 text-slate-600">{new Date(bill.billDate).toLocaleDateString()}</td>
                        <td className="py-3 text-slate-600">{new Date(bill.dueDate).toLocaleDateString()}</td>
                        <td className="py-3">
                          <Badge variant={statusVariant[bill.status] ?? "default"}>{bill.status.replaceAll("_", " ")}</Badge>
                        </td>
                        <td className="py-3 text-right text-slate-900">{formatCurrency(overview.summary.currency, bill.total)}</td>
                        <td className="py-3 text-right text-slate-900">{formatCurrency(overview.summary.currency, bill.amountDue)}</td>
                        <td className="py-3 text-right">
                          {canPay ? <BillPaymentForm billId={bill.id} amountDue={bill.amountDue} paymentAccounts={deps.paymentAccounts} /> : <span className="text-xs text-slate-400">Closed</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview.expenses.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No expenses recorded yet.</div>
            ) : (
              overview.expenses.map((expense) => (
                <div key={expense.id} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{expense.description}</p>
                      <p className="text-xs text-slate-500">{expense.vendorName} · {expense.expenseAccountName}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(overview.summary.currency, expense.amount)}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{new Date(expense.expenseDate).toLocaleDateString()}</span>
                    <span>Paid from {expense.paymentAccountName}</span>
                  </div>
                  {expense.notes ? <p className="text-xs text-slate-500">{expense.notes}</p> : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
