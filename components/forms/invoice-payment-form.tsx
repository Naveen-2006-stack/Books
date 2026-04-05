"use client";

import { useActionState } from "react";
import { recordInvoicePaymentAction } from "@/app/(app)/sales/actions";
import { Button } from "@/components/ui/button";

const initialState = { ok: false, message: "" };

type Props = {
  invoiceId: string;
  amountDue: number;
  depositAccounts: Array<{ id: string; code: string; name: string }>;
};

export function InvoicePaymentForm({ invoiceId, amountDue, depositAccounts }: Props) {
  const [state, formAction, isPending] = useActionState(recordInvoicePaymentAction, initialState);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="invoice_id" value={invoiceId} />
      <div className="flex flex-wrap items-center justify-end gap-1">
        <input
          name="amount"
          type="number"
          min="0.01"
          max={String(amountDue)}
          step="0.01"
          defaultValue={amountDue.toFixed(2)}
          className="w-24 rounded-md border border-slate-200 px-2 py-1 text-xs"
        />

        <input
          name="payment_date"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="rounded-md border border-slate-200 px-2 py-1 text-xs"
        />

        <select name="deposited_to_account_id" className="rounded-md border border-slate-200 px-2 py-1 text-xs" defaultValue="">
          <option value="" disabled>
            Deposit to
          </option>
          {depositAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.code} - {account.name}
            </option>
          ))}
        </select>

        <Button type="submit" variant="outline" size="sm" disabled={isPending || depositAccounts.length === 0}>
          {isPending ? "..." : "Receive"}
        </Button>
      </div>
      {state.message ? <span className={`text-[10px] ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</span> : null}
    </form>
  );
}
