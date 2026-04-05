import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  currency: string;
  expenses: Array<{ category: string; amount: number; share: number }>;
};

function formatCurrency(currency: string, value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export function TopExpenses({ currency, expenses }: Props) {
  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-rose-500 via-amber-400 to-teal-500" />
      <CardHeader>
        <CardTitle>Top Expenses</CardTitle>
        <CardDescription>Largest spend categories this month.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {expenses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">
            No expense activity yet.
          </div>
        ) : (
          expenses.map((expense) => (
            <div key={expense.category} className="space-y-2 rounded-2xl border border-slate-200/70 bg-slate-50/80 px-3 py-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{expense.category}</p>
                  <p className="text-xs text-slate-500">{expense.share}% of monthly spend</p>
                </div>
                <p className="text-sm font-semibold text-slate-900">{formatCurrency(currency, expense.amount)}</p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 via-cyan-400 to-amber-400"
                  style={{ width: `${Math.min(100, Math.max(0, expense.share))}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
