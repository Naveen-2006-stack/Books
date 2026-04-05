"use client";

import { useActionState } from "react";
import { createExpenseAction } from "@/app/(app)/purchases/actions";
import { Button } from "@/components/ui/button";

const initialState = { ok: false, message: "" };

type Props = {
  vendors: Array<{ id: string; display_name: string }>;
  expenseAccounts: Array<{ id: string; code: string; name: string }>;
  paymentAccounts: Array<{ id: string; code: string; name: string }>;
};

export function ExpenseCreateForm({ vendors, expenseAccounts, paymentAccounts }: Props) {
  const [state, formAction, isPending] = useActionState(createExpenseAction, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <select name="vendor_id" defaultValue="" className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring">
          <option value="">Optional vendor</option>
          {vendors.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.display_name}
            </option>
          ))}
        </select>
        <input name="expense_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring" />
        <input name="description" placeholder="Expense description" className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring" required />
        <input name="amount" type="number" min="0.01" step="0.01" placeholder="Amount" className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring" required />
        <select name="expense_account_id" defaultValue="" className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring">
          <option value="" disabled>
            Expense account
          </option>
          {expenseAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.code} - {account.name}
            </option>
          ))}
        </select>
        <select name="payment_account_id" defaultValue="" className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring">
          <option value="" disabled>
            Paid from
          </option>
          {paymentAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.code} - {account.name}
            </option>
          ))}
        </select>
        <input name="notes" placeholder="Notes" className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring" />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">Records the expense and posts the matching journal entry.</p>
        <Button type="submit" disabled={isPending || expenseAccounts.length === 0 || paymentAccounts.length === 0}>
          {isPending ? "Saving..." : "Record Expense"}
        </Button>
      </div>

      {state.message ? <p className={`text-xs ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p> : null}
    </form>
  );
}