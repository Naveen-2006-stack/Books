"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyContext } from "@/lib/data/company-context";

type ActionState = { ok: boolean; message: string };

export async function createItemAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { companyId } = await getActiveCompanyContext();

  if (!companyId) {
    return { ok: false, message: "Missing active company context." };
  }

  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const rawItemType = String(formData.get("item_type") ?? "service");
  const item_type: "goods" | "service" = rawItemType === "goods" ? "goods" : "service";
  const selling_price = Number(formData.get("selling_price") ?? 0);
  const cost_price = Number(formData.get("cost_price") ?? 0);

  if (!name) {
    return { ok: false, message: "Item name is required." };
  }

  if (Number.isNaN(selling_price) || Number.isNaN(cost_price) || selling_price < 0 || cost_price < 0) {
    return { ok: false, message: "Prices must be valid positive numbers." };
  }

  const { error } = await supabase
    .from("items")
    .insert({
      company_id: companyId,
      name,
      item_type,
      selling_price,
      cost_price,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/items");
  return { ok: true, message: "Item created." };
}

export async function deleteItemAction(itemId: string): Promise<ActionState> {
  const { companyId } = await getActiveCompanyContext();

  if (!companyId) {
    return { ok: false, message: "Missing active company context." };
  }

  const supabase = await createClient();

  const { data: linkedLineItems, error: linkError } = (await supabase
    .from("invoice_line_items")
    .select("invoice_id")
    .eq("item_id", itemId)
    .eq("company_id", companyId)) as {
    data: Array<{ invoice_id: string }> | null;
    error: { message: string } | null;
  };

  if (linkError) {
    return { ok: false, message: linkError.message };
  }

  const linkedInvoiceIds = Array.from(new Set((linkedLineItems ?? []).map((lineItem) => lineItem.invoice_id)));

  if (linkedInvoiceIds.length > 0) {
    const { data: paidInvoice, error: paidInvoiceError } = await supabase
      .from("invoices")
      .select("id")
      .eq("company_id", companyId)
      .eq("status", "paid")
      .in("id", linkedInvoiceIds)
      .limit(1)
      .maybeSingle();

    if (paidInvoiceError) {
      return { ok: false, message: paidInvoiceError.message };
    }

    if (paidInvoice) {
      return { ok: false, message: "Cannot delete item linked to a paid invoice." };
    }
  }

  const { error } = await supabase
    .from("items")
    .delete()
    .eq("company_id", companyId)
    .eq("id", itemId)
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/items");
  return { ok: true, message: "Item deleted." };
}
