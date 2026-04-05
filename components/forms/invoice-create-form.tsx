"use client";

import { useActionState } from "react";
import { createInvoiceAction } from "@/app/(app)/sales/actions";
import { Button } from "@/components/ui/button";

const initialState = { ok: false, message: "" };

type Props = {
  customers: Array<{ id: string; display_name: string }>;
  items: Array<{ id: string; name: string; selling_price: number }>;
};

export function InvoiceCreateForm({ customers, items }: Props) {
  const [state, formAction, isPending] = useActionState(createInvoiceAction, initialState);

  const today = new Date().toISOString().slice(0, 10);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-4">
        <select
          name="customer_id"
          required
          className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
          defaultValue=""
        >
          <option value="" disabled>
            Select customer
          </option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.display_name}
            </option>
          ))}
        </select>

        <input
          name="issue_date"
          type="date"
          defaultValue={today}
          className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
        />

        <input
          name="due_date"
          type="date"
          defaultValue={dueDate.toISOString().slice(0, 10)}
          className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
        />

        <select
          name="status"
          defaultValue="draft"
          className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
        >
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <th className="pb-2">Item</th>
              <th className="pb-2">Description</th>
              <th className="pb-2">Qty</th>
              <th className="pb-2">Unit Price</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map((line) => (
              <tr key={line} className="border-b border-slate-100">
                <td className="py-2 pr-2">
                  <select
                    name={`item_id_${line}`}
                    defaultValue=""
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
                  >
                    <option value="">Line {line}: skip</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-2">
                  <input
                    name={`description_${line}`}
                    placeholder="Optional custom description"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    name={`quantity_${line}`}
                    type="number"
                    min="0.0001"
                    step="0.0001"
                    defaultValue="1"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
                  />
                </td>
                <td className="py-2">
                  <input
                    name={`unit_price_${line}`}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Default from item"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <input type="hidden" name="line_count" value="3" />

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Add at least one item line. Taxes and discounts will be added in the next iteration.</p>
        <Button type="submit" disabled={isPending || customers.length === 0 || items.length === 0}>
          {isPending ? "Creating..." : "Create Invoice"}
        </Button>
      </div>

      {state.message ? <p className={`text-xs ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p> : null}
    </form>
  );
}
