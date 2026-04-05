"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyContext } from "@/lib/data/company-context";

type ActionState = { ok: boolean; message: string };

export async function createContactAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { companyId } = await getActiveCompanyContext();

  if (!companyId) {
    return { ok: false, message: "Missing active company context." };
  }

  const supabase = await createClient();

  const display_name = String(formData.get("display_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const rawContactType = String(formData.get("contact_type") ?? "customer");
  const contact_type: "customer" | "vendor" | "both" =
    rawContactType === "vendor" || rawContactType === "both" ? rawContactType : "customer";

  if (!display_name) {
    return { ok: false, message: "Display name is required." };
  }

  const { error } = await supabase
    .from("contacts")
    .insert({ company_id: companyId, display_name, email, phone, contact_type })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/contacts");
  return { ok: true, message: "Contact created." };
}

export async function deleteContactAction(contactId: string): Promise<ActionState> {
  const { companyId } = await getActiveCompanyContext();

  if (!companyId) {
    return { ok: false, message: "Missing active company context." };
  }

  const supabase = await createClient();

  const [{ data: invoiceMatch }, { data: billMatch }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id")
      .eq("company_id", companyId)
      .eq("customer_id", contactId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("bills")
      .select("id")
      .eq("company_id", companyId)
      .eq("vendor_id", contactId)
      .limit(1)
      .maybeSingle(),
  ]);

  if (invoiceMatch || billMatch) {
    return {
      ok: false,
      message: "Cannot delete contact linked to existing invoices or bills.",
    };
  }

  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("company_id", companyId)
    .eq("id", contactId)
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/contacts");
  return { ok: true, message: "Contact deleted." };
}
