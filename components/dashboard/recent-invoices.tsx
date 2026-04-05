import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const statusVariant: Record<string, "default" | "success" | "warning"> = {
  draft: "default",
  sent: "warning",
  partially_paid: "warning",
  paid: "success",
};

type Props = {
  currency: string;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    customerName: string;
    dueDate: string;
    status: "draft" | "sent" | "partially_paid" | "paid" | "void" | "cancelled";
    amount: number;
    amountPaid: number;
    amountDue: number;
  }>;
};

function formatCurrency(currency: string, value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export function RecentInvoices({ currency, invoices }: Props) {
  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-slate-950 via-teal-500 to-amber-400" />
      <CardHeader>
        <CardTitle>Recent Invoices</CardTitle>
        <CardDescription>Latest AR activity in your sales ledger.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {invoices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">
            No invoices yet. Create one from the Sales page.
          </div>
        ) : (
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2">Invoice</th>
                <th className="pb-2">Customer</th>
                <th className="pb-2">Due</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-slate-100/80 transition-colors hover:bg-teal-50/40 last:border-b-0">
                  <td className="py-3 font-medium text-slate-800">{invoice.invoiceNumber}</td>
                  <td className="py-3 text-slate-600">{invoice.customerName}</td>
                  <td className="py-3 text-slate-600">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                  <td className="py-3">
                    <Badge variant={statusVariant[invoice.status] ?? "default"}>{invoice.status.replaceAll("_", " ")}</Badge>
                  </td>
                  <td className="py-3 text-right font-medium text-slate-900">{formatCurrency(currency, invoice.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
