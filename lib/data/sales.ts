import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyContext } from "@/lib/data/company-context";

export type InvoiceQueryParams = {
  page: number;
  pageSize: number;
  search: string;
  sortBy: "invoice_number" | "due_date" | "created_at" | "total";
  sortDir: "asc" | "desc";
  status: "all" | "draft" | "sent" | "partially_paid" | "paid" | "void" | "cancelled";
};

export type InvoiceRow = {
  id: string;
  customer_id: string;
  customer_name: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: "draft" | "sent" | "partially_paid" | "paid" | "void" | "cancelled";
  total: number;
  amount_paid: number;
  amount_due: number;
  created_at: string;
};

export async function getInvoices(params: InvoiceQueryParams) {
  const { companyId, error: contextError } = await getActiveCompanyContext();

  if (!companyId) {
    return { rows: [] as InvoiceRow[], total: 0, error: contextError ?? "Missing company context." };
  }

  const supabase = await createClient();
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  let query = supabase
    .from("invoices")
    .select(
      "id, customer_id, invoice_number, issue_date, due_date, status, total, amount_paid, amount_due, created_at",
      { count: "exact" },
    )
    .eq("company_id", companyId)
    .order(params.sortBy, { ascending: params.sortDir === "asc" })
    .range(from, to);

  if (params.search) {
    query = query.or(`invoice_number.ilike.%${params.search}%`);
  }

  if (params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const { data: invoices, count, error } = await query;

  if (error) {
    return { rows: [] as InvoiceRow[], total: 0, error: error.message };
  }

  const invoiceRows = (invoices ?? []) as InvoiceRow[];
  const customerIds = Array.from(new Set(invoiceRows.map((row) => row.customer_id)));

  let customerNameById = new Map<string, string>();

  if (customerIds.length > 0) {
    const { data: contacts } = await supabase
      .from("contacts")
      .select("id, display_name")
      .eq("company_id", companyId)
      .in("id", customerIds);

    const contactRows = (contacts ?? []) as Array<{ id: string; display_name: string }>;
    customerNameById = new Map(contactRows.map((contact) => [contact.id, contact.display_name]));
  }

  const rows: InvoiceRow[] = invoiceRows.map((row) => ({
    ...row,
    customer_name: customerNameById.get(row.customer_id) ?? "Unknown customer",
  }));

  return { rows, total: count ?? 0, error: null };
}

export async function getInvoiceCreateDependencies() {
  const { companyId, error: contextError } = await getActiveCompanyContext();

  if (!companyId) {
    return {
      customers: [] as Array<{ id: string; display_name: string }>,
      items: [] as Array<{ id: string; name: string; selling_price: number }>,
      depositAccounts: [] as Array<{ id: string; code: string; name: string }>,
      currency: "USD",
      error: contextError ?? "Missing company context.",
    };
  }

  const supabase = await createClient();

  const [{ data: customers, error: customerError }, { data: items, error: itemError }, { data: depositAccounts, error: accountError }, { data: company, error: companyError }] =
    await Promise.all([
      supabase
        .from("contacts")
        .select("id, display_name")
        .eq("company_id", companyId)
        .in("contact_type", ["customer", "both"])
        .eq("is_active", true)
        .order("display_name", { ascending: true }),
      supabase
        .from("items")
        .select("id, name, selling_price")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase
        .from("accounts")
        .select("id, code, name")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .eq("category", "asset")
        .order("code", { ascending: true }),
      supabase.from("companies").select("base_currency").eq("id", companyId).maybeSingle(),
    ]);

  const firstError = customerError ?? itemError ?? accountError ?? companyError;

  if (firstError) {
    return {
      customers: [] as Array<{ id: string; display_name: string }>,
      items: [] as Array<{ id: string; name: string; selling_price: number }>,
      depositAccounts: [] as Array<{ id: string; code: string; name: string }>,
      currency: "USD",
      error: firstError.message,
    };
  }

  return {
    customers: (customers ?? []) as Array<{ id: string; display_name: string }>,
    items: (items ?? []) as Array<{ id: string; name: string; selling_price: number }>,
    depositAccounts: (depositAccounts ?? []) as Array<{ id: string; code: string; name: string }>,
    currency: company?.base_currency ?? "USD",
    error: null,
  };
}
