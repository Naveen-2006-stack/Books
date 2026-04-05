import { InvoiceCreateForm } from "@/components/forms/invoice-create-form";
import { InvoicePaymentForm } from "@/components/forms/invoice-payment-form";
import { TableQueryControls } from "@/components/tables/table-query-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInvoiceCreateDependencies, getInvoices } from "@/lib/data/sales";

type SalesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const invoiceStatusMeta = {
  draft: { label: "Draft", variant: "default" as const },
  sent: { label: "Posted", variant: "posted" as const },
  partially_paid: { label: "Partially paid", variant: "posted" as const },
  paid: { label: "Paid", variant: "success" as const },
  void: { label: "Void", variant: "danger" as const },
  cancelled: { label: "Cancelled", variant: "danger" as const },
} as const;

export default async function SalesPage({ searchParams }: SalesPageProps) {
  const params = (await searchParams) ?? {};

  const page = Number(params.page ?? 1) || 1;
  const pageSize = Number(params.pageSize ?? 10) || 10;
  const search = String(params.search ?? "");
  const sortBy = String(params.sortBy ?? "created_at") as "invoice_number" | "due_date" | "created_at" | "total";
  const sortDir = String(params.sortDir ?? "desc") as "asc" | "desc";
  const status = String(params.status ?? "all") as "all" | "draft" | "sent" | "partially_paid" | "paid" | "void" | "cancelled";

  const [{ rows, total, error }, deps] = await Promise.all([
    getInvoices({
      page,
      pageSize,
      search,
      sortBy,
      sortDir,
      status,
    }),
    getInvoiceCreateDependencies(),
  ]);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Create Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          {deps.error ? <p className="mb-3 text-sm text-rose-700">{deps.error}</p> : null}
          <InvoiceCreateForm customers={deps.customers} items={deps.items} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="mb-4 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-6">
            <input
              name="search"
              defaultValue={search}
              placeholder="Search invoice number"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
            <select name="status" defaultValue={status} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="partially_paid">Partially paid</option>
              <option value="paid">Paid</option>
              <option value="void">Void</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select name="sortBy" defaultValue={sortBy} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
              <option value="created_at">Sort: Created</option>
              <option value="invoice_number">Sort: Invoice #</option>
              <option value="due_date">Sort: Due date</option>
              <option value="total">Sort: Total</option>
            </select>
            <select name="sortDir" defaultValue={sortDir} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
            <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white">Apply</button>
            <input type="hidden" name="page" value="1" />
            <input type="hidden" name="pageSize" value={String(pageSize)} />
          </form>

          {error ? <p className="mb-3 text-sm text-rose-700">{error}</p> : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1020px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2">Invoice #</th>
                  <th className="pb-2">Customer</th>
                  <th className="pb-2">Issue</th>
                  <th className="pb-2">Due</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Total ({deps.currency})</th>
                  <th className="pb-2">Paid ({deps.currency})</th>
                  <th className="pb-2">Due ({deps.currency})</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const canReceivePayment = row.amount_due > 0 && row.status !== "void" && row.status !== "cancelled";

                  return (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="py-3 font-medium text-slate-900">{row.invoice_number}</td>
                      <td className="py-3 text-slate-700">{row.customer_name}</td>
                      <td className="py-3 text-slate-600">{new Date(row.issue_date).toLocaleDateString()}</td>
                      <td className="py-3 text-slate-600">{new Date(row.due_date).toLocaleDateString()}</td>
                      <td className="py-3">
                        <Badge variant={invoiceStatusMeta[row.status].variant}>{invoiceStatusMeta[row.status].label}</Badge>
                      </td>
                      <td className="py-3 text-slate-700">{Number(row.total).toFixed(2)}</td>
                      <td className="py-3 text-slate-700">{Number(row.amount_paid).toFixed(2)}</td>
                      <td className="py-3 text-slate-900">{Number(row.amount_due).toFixed(2)}</td>
                      <td className="py-3 text-right">
                        {canReceivePayment ? (
                          <InvoicePaymentForm
                            invoiceId={row.id}
                            amountDue={Number(row.amount_due)}
                            depositAccounts={deps.depositAccounts}
                          />
                        ) : (
                          <span className="text-xs text-slate-400">No action</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <TableQueryControls
            basePath="/sales"
            page={page}
            pageSize={pageSize}
            total={total}
            search={search}
            sortBy={sortBy}
            sortDir={sortDir}
            filterValue={status}
            filterKey="status"
          />
        </CardContent>
      </Card>
    </div>
  );
}
