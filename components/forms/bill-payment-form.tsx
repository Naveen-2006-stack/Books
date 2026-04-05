"use client";

import { useActionState } from "react";
import { recordBillPaymentAction } from "@/app/(app)/purchases/actions";
import { Button } from "@/components/ui/button";

const initialState = { ok: false, message: "" };

type Props = {
  billId: string;
  amountDue: number;
  paymentAccounts: Array<{ id: string; code: string; name: string }>;
};

export function BillPaymentForm({ billId, amountDue, paymentAccounts }: Props) {
  const [state, formAction, isPending] = useActionState(recordBillPaymentAction, initialState);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="bill_id" value={billId} />
      <div className="flex flex-wrap items-center justify-end gap-1">
        <input name="amount" type="number" min="0.01" max={String(amountDue)} step="0.01" defaultValue={amountDue.toFixed(2)} className="w-24 rounded-md border border-slate-200 px-2 py-1 text-xs" />
        <input name="payment_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="rounded-md border border-slate-200 px-2 py-1 text-xs" />
        <select name="paid_from_account_id" className="rounded-md border border-slate-200 px-2 py-1 text-xs" defaultValue="" required>
          <option value="" disabled>
            Pay from
          </option>
          {paymentAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.code} - {account.name}
            </option>
          ))}
        </select>
        <input name="reference_no" placeholder="Ref" className="w-24 rounded-md border border-slate-200 px-2 py-1 text-xs" />
        <Button type="submit" variant="outline" size="sm" disabled={isPending || paymentAccounts.length === 0}>
          {isPending ? "..." : "Pay"}
        </Button>
      </div>
      <input name="notes" placeholder="Notes" className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs" />
      {state.message ? <span className={`text-[10px] ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</span> : null}
    </form>
  );
}