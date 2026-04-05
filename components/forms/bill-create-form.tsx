"use client";

import { useActionState } from "react";
import { createBillAction } from "@/app/(app)/purchases/actions";
import { Button } from "@/components/ui/button";

const initialState = { ok: false, message: "" };

type Props = {
  vendors: Array<{ id: string; display_name: string }>;
  expenseAccounts: Array<{ id: string; code: string; name: string }>;
};

export function BillCreateForm({ vendors, expenseAccounts }: Props) {
  const [state, formAction, isPending] = useActionState(createBillAction, initialState);

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <select name="vendor_id" defaultValue="" className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring" required>
          <option value="" disabled>
            Select vendor
          </option>
          {vendors.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.display_name}
            </option>
          ))}
        </select>
        <input name="bill_number" placeholder="Optional bill number" className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring" />
        <input name="bill_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring" />
        <input name="due_date" type="date" defaultValue={dueDate.toISOString().slice(0, 10)} className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring" />
        <input name="description" placeholder="Bill description" className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring md:col-span-2" required />
        <input name="amount" type="number" min="0.01" step="0.01" placeholder="Amount" className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring" required />
        <select name="expense_account_id" defaultValue="" className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring" required>
          <option value="" disabled>
            Expense account
          </option>
          {expenseAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.code} - {account.name}
            </option>
          ))}
        </select>
        <select name="status" defaultValue="draft" className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring">
          <option value="draft">Draft</option>
          <option value="sent">Posted</option>
        </select>
        <input name="notes" placeholder="Notes" className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring md:col-span-2" />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">Creates the bill and posts the AP journal when status is set to Posted.</p>
        <Button type="submit" disabled={isPending || vendors.length === 0 || expenseAccounts.length === 0}>
          {isPending ? "Saving..." : "Create Bill"}
        </Button>
      </div>

      {state.message ? <p className={`text-xs ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p> : null}
    </form>
  );
}