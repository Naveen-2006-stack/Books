"use client";

import { useActionState } from "react";
import { createItemAction } from "@/app/(app)/items/actions";
import { Button } from "@/components/ui/button";

const initialState = { ok: false, message: "" };

export function ItemCreateForm() {
  const [state, formAction, isPending] = useActionState(createItemAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-5">
      <input
        name="name"
        placeholder="Item name"
        className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
        required
      />
      <select
        name="item_type"
        defaultValue="service"
        className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
      >
        <option value="service">Service</option>
        <option value="goods">Goods</option>
      </select>
      <input
        name="selling_price"
        type="number"
        min="0"
        step="0.01"
        placeholder="Selling price"
        className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
      />
      <input
        name="cost_price"
        type="number"
        min="0"
        step="0.01"
        placeholder="Cost price"
        className="rounded-md border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
      />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Add Item"}
      </Button>
      {state.message ? (
        <p className={`text-xs ${state.ok ? "text-emerald-700" : "text-rose-700"} md:col-span-5`}>{state.message}</p>
      ) : null}
    </form>
  );
}
