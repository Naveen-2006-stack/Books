"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyContext } from "@/lib/data/company-context";

type ActionState = { ok: boolean; message: string };
type PurchaseStatus = "draft" | "sent" | "partially_paid" | "paid" | "void" | "cancelled";

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

function nextDocumentNumber(prefix: string, latestNumber: string | null | undefined) {
  if (!latestNumber) {
    return `${prefix}-00001`;
  }

  const matched = latestNumber.match(/^(.*?)(\d+)$/);

  if (!matched) {
    return `${prefix}-00001`;
  }

  const current = Number(matched[2]);

  if (Number.isNaN(current)) {
    return `${prefix}-00001`;
  }

  return `${matched[1]}${String(current + 1).padStart(matched[2].length, "0")}`;
}

async function resolveLiabilityAccountId(supabase: Awaited<ReturnType<typeof createClient>>, companyId: string) {
  const { data, error } = await supabase
    .from("accounts")
    .select("id, code, name")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .eq("category", "liability")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const accounts = (data ?? []) as Array<{ id: string; code: string; name: string }>;
  const preferred = accounts.find((account) => /accounts payable|payables|trade payables|ap/i.test(account.name) || /^2/.test(account.code));

  return preferred?.id ?? accounts[0]?.id ?? null;
}

export async function createExpenseAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { companyId, userId } = await getActiveCompanyContext();

  if (!companyId || !userId) {
    return { ok: false, message: "Missing active company context." };
  }

  const supabase = await createClient();
  const vendor_id = String(formData.get("vendor_id") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount") ?? Number.NaN);
  const expense_account_id = String(formData.get("expense_account_id") ?? "").trim();
  const payment_account_id = String(formData.get("payment_account_id") ?? "").trim();
  const expense_date = parseDateInput(formData.get("expense_date"), new Date());
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!description || !expense_account_id || !payment_account_id) {
    return { ok: false, message: "Description, expense account, and payment account are required." };
  }

  if (Number.isNaN(amount) || amount <= 0) {
    return { ok: false, message: "Expense amount must be greater than zero." };
  }

  const { data: expense, error: expenseError } = await supabase
    .from("expenses")
    .insert({
      company_id: companyId,
      vendor_id,
      payment_account_id,
      expense_account_id,
      description,
      amount,
      tax_amount: 0,
      total_amount: amount,
      expense_date,
      notes,
      created_by: userId,
    })
    .select("id")
    .single();

  if (expenseError || !expense) {
    return { ok: false, message: expenseError?.message ?? "Failed to create expense." };
  }

  const { data: journalEntry, error: journalError } = await supabase
    .from("journal_entries")
    .insert({
      company_id: companyId,
      entry_date: expense_date,
      source_type: "expense",
      source_id: expense.id,
      memo: description,
      posted_by: userId,
    })
    .select("id")
    .single();

  if (journalError || !journalEntry) {
    return { ok: false, message: journalError?.message ?? "Failed to post expense journal entry." };
  }

  const { error: ledgerError } = await supabase.from("general_ledger").insert([
    {
      company_id: companyId,
      journal_entry_id: journalEntry.id,
      account_id: expense_account_id,
      description,
      debit: amount,
      credit: 0,
      line_no: 1,
    },
    {
      company_id: companyId,
      journal_entry_id: journalEntry.id,
      account_id: payment_account_id,
      description,
      debit: 0,
      credit: amount,
      line_no: 2,
    },
  ]);

  if (ledgerError) {
    return { ok: false, message: ledgerError.message };
  }

  revalidatePath("/purchases");
  revalidatePath("/dashboard");
  revalidatePath("/accounting");

  return { ok: true, message: `Expense ${description} recorded.` };
}

export async function createBillAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { companyId, userId } = await getActiveCompanyContext();

  if (!companyId || !userId) {
    return { ok: false, message: "Missing active company context." };
  }

  const supabase = await createClient();
  const vendor_id = String(formData.get("vendor_id") ?? "").trim();
  const bill_number_input = String(formData.get("bill_number") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount") ?? Number.NaN);
  const expense_account_id = String(formData.get("expense_account_id") ?? "").trim();
  const bill_date = parseDateInput(formData.get("bill_date"), new Date());
  const due_date = parseDateInput(
    formData.get("due_date"),
    new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 14),
  );
  const status = String(formData.get("status") ?? "draft") === "sent" ? "sent" : "draft";
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!vendor_id || !expense_account_id || !description) {
    return { ok: false, message: "Vendor, description, and expense account are required." };
  }

  if (Number.isNaN(amount) || amount <= 0) {
    return { ok: false, message: "Bill amount must be greater than zero." };
  }

  const { data: latestBill, error: latestBillError } = await supabase
    .from("bills")
    .select("bill_number")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestBillError) {
    return { ok: false, message: latestBillError.message };
  }

  const bill_number = bill_number_input || nextDocumentNumber("BILL", latestBill?.bill_number);
  const liabilityAccountId = await resolveLiabilityAccountId(supabase, companyId);

  const { data: bill, error: billError } = await supabase
    .from("bills")
    .insert({
      company_id: companyId,
      vendor_id,
      bill_number,
      bill_date,
      due_date,
      status,
      notes,
      subtotal: amount,
      tax_total: 0,
      total: amount,
      amount_paid: 0,
      amount_due: amount,
      currency_code: "USD",
      created_by: userId,
    })
    .select("id")
    .single();

  if (billError || !bill) {
    return { ok: false, message: billError?.message ?? "Failed to create bill." };
  }

  const { error: billLineError } = await supabase.from("bill_line_items").insert({
    company_id: companyId,
    bill_id: bill.id,
    expense_account_id,
    description,
    quantity: 1,
    unit_price: amount,
    line_subtotal: amount,
    line_tax: 0,
    line_total: amount,
    line_no: 1,
  });

  if (billLineError) {
    return { ok: false, message: billLineError.message };
  }

  if (status === "sent" && liabilityAccountId) {
    const { data: journalEntry, error: journalError } = await supabase
      .from("journal_entries")
      .insert({
        company_id: companyId,
        entry_date: bill_date,
        source_type: "bill",
        source_id: bill.id,
        memo: bill_number,
        posted_by: userId,
      })
      .select("id")
      .single();

    if (journalError || !journalEntry) {
      return { ok: false, message: journalError?.message ?? "Failed to post bill journal entry." };
    }

    const { error: ledgerError } = await supabase.from("general_ledger").insert([
      {
        company_id: companyId,
        journal_entry_id: journalEntry.id,
        account_id: expense_account_id,
        description: bill_number,
        debit: amount,
        credit: 0,
        line_no: 1,
      },
      {
        company_id: companyId,
        journal_entry_id: journalEntry.id,
        account_id: liabilityAccountId,
        description: bill_number,
        debit: 0,
        credit: amount,
        line_no: 2,
      },
    ]);

    if (ledgerError) {
      return { ok: false, message: ledgerError.message };
    }
  }

  revalidatePath("/purchases");
  revalidatePath("/dashboard");
  revalidatePath("/accounting");

  return { ok: true, message: `Bill ${bill_number} saved.` };
}

export async function recordBillPaymentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { companyId, userId } = await getActiveCompanyContext();

  if (!companyId || !userId) {
    return { ok: false, message: "Missing active company context." };
  }

  const supabase = await createClient();
  const bill_id = String(formData.get("bill_id") ?? "").trim();
  const paid_from_account_id = String(formData.get("paid_from_account_id") ?? "").trim();
  const amount = Number(formData.get("amount") ?? Number.NaN);
  const payment_date = parseDateInput(formData.get("payment_date"), new Date());
  const reference_no = String(formData.get("reference_no") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!bill_id || !paid_from_account_id) {
    return { ok: false, message: "Bill and payment account are required." };
  }

  if (Number.isNaN(amount) || amount <= 0) {
    return { ok: false, message: "Payment amount must be greater than zero." };
  }

  const { data: bill, error: billError } = await supabase
    .from("bills")
    .select("id, bill_number, total, amount_paid, amount_due, status, bill_date")
    .eq("company_id", companyId)
    .eq("id", bill_id)
    .maybeSingle();

  if (billError) {
    return { ok: false, message: billError.message };
  }

  if (!bill) {
    return { ok: false, message: "Bill not found." };
  }

  if (amount > Number(bill.amount_due ?? 0)) {
    return { ok: false, message: "Payment exceeds the amount due." };
  }

  const nextPaid = Number((Number(bill.amount_paid ?? 0) + amount).toFixed(2));
  const nextDue = Number(Math.max(Number(bill.total ?? 0) - nextPaid, 0).toFixed(2));
  const nextStatus: PurchaseStatus = nextDue === 0 ? "paid" : "partially_paid";

  const { error: updateError } = await supabase
    .from("bills")
    .update({ amount_paid: nextPaid, amount_due: nextDue, status: nextStatus })
    .eq("company_id", companyId)
    .eq("id", bill_id);

  if (updateError) {
    return { ok: false, message: updateError.message };
  }

  const { data: payment, error: paymentError } = await supabase
    .from("bill_payments")
    .insert({
      company_id: companyId,
      bill_id,
      payment_date,
      amount,
      payment_method: null,
      reference_no,
      notes,
      paid_from_account_id,
      created_by: userId,
    })
    .select("id")
    .single();

  if (paymentError || !payment) {
    return { ok: false, message: paymentError?.message ?? "Failed to create bill payment." };
  }

  const liabilityAccountId = await resolveLiabilityAccountId(supabase, companyId);

  if (liabilityAccountId) {
    const { data: journalEntry, error: journalError } = await supabase
      .from("journal_entries")
      .insert({
        company_id: companyId,
        entry_date: payment_date,
        source_type: "bill_payment",
        source_id: payment.id,
        memo: reference_no ?? bill.bill_number,
        posted_by: userId,
      })
      .select("id")
      .single();

    if (journalError || !journalEntry) {
      return { ok: false, message: journalError?.message ?? "Failed to post bill payment journal entry." };
    }

    const { error: ledgerError } = await supabase.from("general_ledger").insert([
      {
        company_id: companyId,
        journal_entry_id: journalEntry.id,
        account_id: liabilityAccountId,
        description: bill.bill_number,
        debit: amount,
        credit: 0,
        line_no: 1,
      },
      {
        company_id: companyId,
        journal_entry_id: journalEntry.id,
        account_id: paid_from_account_id,
        description: bill.bill_number,
        debit: 0,
        credit: amount,
        line_no: 2,
      },
    ]);

    if (ledgerError) {
      return { ok: false, message: ledgerError.message };
    }
  }

  revalidatePath("/purchases");
  revalidatePath("/dashboard");
  revalidatePath("/accounting");

  return { ok: true, message: nextStatus === "paid" ? "Bill paid in full." : "Bill payment recorded." };
}