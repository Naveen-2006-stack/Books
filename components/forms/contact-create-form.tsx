"use client";

import { useActionState } from "react";
import { createContactAction } from "@/app/(app)/contacts/actions";
import { Button } from "@/components/ui/button";

const initialState = { ok: false, message: "" };

export function ContactCreateForm() {
  const [state, formAction, isPending] = useActionState(createContactAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-5">
      <input
        name="display_name"
        placeholder="Display name"
        className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
        required
      />
      <input
        name="email"
        placeholder="Email"
        className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
      />
      <input
        name="phone"
        placeholder="Phone"
        className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
      />
      <select
        name="contact_type"
        defaultValue="customer"
        className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
      >
        <option value="customer">Customer</option>
        <option value="vendor">Vendor</option>
        <option value="both">Both</option>
      </select>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Add Contact"}
      </Button>
      {state.message ? (
        <p className={`text-xs ${state.ok ? "text-emerald-700" : "text-rose-700"} md:col-span-5`}>{state.message}</p>
      ) : null}
    </form>
  );
}
