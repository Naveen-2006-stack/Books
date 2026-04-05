"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyContext } from "@/lib/data/company-context";

type ActionState = { ok: boolean; message: string };

function parseDateInput(value: FormDataEntryValue | null, fallback: Date) {
  if (!value) {
    return fallback.toISOString().slice(0, 10);
  }

  const parsed = new Date(String(value));

  if (Number.isNaN(parsed.getTime())) {
    return fallback.toISOString().slice(0, 10);
  }

  return parsed.toISOString().slice(0, 10);
}

function nextInvoiceNumber(lastInvoiceNumber: string | null | undefined) {
  const fallbackPrefix = "INV";

  if (!lastInvoiceNumber) {
    return `${fallbackPrefix}-00001`;
  }

  const matched = lastInvoiceNumber.match(/^(.*?)(\d+)$/);

  if (!matched) {
    return `${fallbackPrefix}-00001`;
  }

  const prefix = matched[1];
  const current = Number(matched[2]);

  if (Number.isNaN(current)) {
    return `${fallbackPrefix}-00001`;
  }

  const next = String(current + 1).padStart(matched[2].length, "0");
  return `${prefix}${next}`;
}

export async function createInvoiceAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { companyId, userId } = await getActiveCompanyContext();

  if (!companyId || !userId) {
    return { ok: false, message: "Missing active company context." };
  }

  const supabase = await createClient();

  const customer_id = String(formData.get("customer_id") ?? "").trim();
  const statusInput = String(formData.get("status") ?? "draft");
  const status: "draft" | "sent" = statusInput === "sent" ? "sent" : "draft";
  const issueDate = parseDateInput(formData.get("issue_date"), new Date());

  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + 7);
  const dueDate = parseDateInput(formData.get("due_date"), defaultDueDate);

  if (!customer_id) {
    return { ok: false, message: "Customer is required." };
  }

  const lineCount = Number(formData.get("line_count") ?? 3);
  const draftLines: Array<{ item_id: string; quantity: number; unit_price: number; description: string }> = [];

  for (let i = 1; i <= lineCount; i += 1) {
    const item_id = String(formData.get(`item_id_${i}`) ?? "").trim();

    if (!item_id) {
      continue;
    }

    const quantity = Number(formData.get(`quantity_${i}`) ?? 1);
    const unit_price = Number(formData.get(`unit_price_${i}`) ?? Number.NaN);
    const description = String(formData.get(`description_${i}`) ?? "").trim();

    if (Number.isNaN(quantity) || quantity <= 0) {
      return { ok: false, message: `Line ${i}: quantity must be greater than zero.` };
    }

    draftLines.push({
      item_id,
      quantity,
      unit_price,
      description,
    });
  }

  if (draftLines.length === 0) {
    return { ok: false, message: "Add at least one line item." };
  }

  const itemIds = draftLines.map((line) => line.item_id);

  const [{ data: items, error: itemError }, { data: company, error: companyError }, { data: latestInvoice, error: latestInvoiceError }] =
    await Promise.all([
      supabase.from("items").select("id, name, selling_price").eq("company_id", companyId).in("id", itemIds),
      supabase.from("companies").select("base_currency").eq("id", companyId).maybeSingle(),
      supabase
        .from("invoices")
        .select("invoice_number")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (itemError || companyError || latestInvoiceError) {
    return {
      ok: false,
      message: itemError?.message ?? companyError?.message ?? latestInvoiceError?.message ?? "Failed to prepare invoice.",
    };
  }

  const itemRows = (items ?? []) as Array<{ id: string; name: string; selling_price: number }>;
  const itemMap = new Map(itemRows.map((item) => [item.id, item]));

  const lines = draftLines.map((line) => {
    const item = itemMap.get(line.item_id);

    if (!item) {
      throw new Error("One or more items are invalid for this company.");
    }

    const unitPrice = Number.isNaN(line.unit_price) ? Number(item.selling_price) : line.unit_price;

    if (unitPrice < 0) {
      throw new Error("Line item unit prices must be positive.");
    }

    return {
      item_id: line.item_id,
      description: line.description || item.name,
      quantity: Number(line.quantity.toFixed(4)),
      unit_price: Number(unitPrice.toFixed(2)),
    };
  });

  const invoice_number = nextInvoiceNumber(latestInvoice?.invoice_number);

  const { data, error } = await supabase.rpc("create_sales_invoice", {
    p_company_id: companyId,
    p_created_by: userId,
    p_customer_id: customer_id,
    p_issue_date: issueDate,
    p_due_date: dueDate,
    p_status: status,
    p_currency_code: company?.base_currency ?? "USD",
    p_invoice_number: invoice_number,
    p_lines: lines,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  const result = data as { invoice_number?: string; journal_entry_id?: string | null } | null;
  const posted = Boolean(result?.journal_entry_id);

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  return { ok: true, message: posted ? `Invoice ${result?.invoice_number ?? invoice_number} posted.` : `Draft invoice ${result?.invoice_number ?? invoice_number} saved.` };
}

export async function recordInvoicePaymentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { companyId, userId } = await getActiveCompanyContext();

  if (!companyId || !userId) {
    return { ok: false, message: "Missing active company context." };
  }

  const supabase = await createClient();

  const invoice_id = String(formData.get("invoice_id") ?? "").trim();
  const deposited_to_account_id = String(formData.get("deposited_to_account_id") ?? "").trim();
  const amount = Number(formData.get("amount") ?? Number.NaN);
  const payment_date = parseDateInput(formData.get("payment_date"), new Date());
  const reference_no = String(formData.get("reference_no") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!invoice_id || !deposited_to_account_id) {
    return { ok: false, message: "Invoice and deposit account are required." };
  }

  if (Number.isNaN(amount) || amount <= 0) {
    return { ok: false, message: "Payment amount must be greater than zero." };
  }

  const { data, error } = await supabase.rpc("record_sales_invoice_payment", {
    p_company_id: companyId,
    p_invoice_id: invoice_id,
    p_created_by: userId,
    p_payment_date: payment_date,
    p_amount: amount,
    p_deposited_to_account_id: deposited_to_account_id,
    p_reference_no: reference_no,
    p_notes: notes,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  const result = data as { status?: "partially_paid" | "paid" } | null;
  return { ok: true, message: result?.status === "paid" ? "Payment recorded and invoice paid in full." : "Payment recorded and invoice updated." };
}
