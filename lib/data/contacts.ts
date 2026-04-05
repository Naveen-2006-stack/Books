import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyContext } from "@/lib/data/company-context";

export type ContactQueryParams = {
  page: number;
  pageSize: number;
  search: string;
  sortBy: "display_name" | "created_at";
  sortDir: "asc" | "desc";
  type: "all" | "customer" | "vendor" | "both";
};

export type ContactRow = {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  contact_type: "customer" | "vendor" | "both";
  created_at: string;
};

export async function getContacts(params: ContactQueryParams) {
  const { companyId, error: contextError } = await getActiveCompanyContext();

  if (!companyId) {
    return { rows: [], total: 0, error: contextError ?? "Missing company context." };
  }

  const supabase = await createClient();
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  let query = supabase
    .from("contacts")
    .select("id, display_name, email, phone, contact_type, created_at", { count: "exact" })
    .eq("company_id", companyId)
    .order(params.sortBy, { ascending: params.sortDir === "asc" })
    .range(from, to);

  if (params.search) {
    query = query.or(`display_name.ilike.%${params.search}%,email.ilike.%${params.search}%`);
  }

  if (params.type !== "all") {
    query = query.eq("contact_type", params.type);
  }

  const { data, count, error } = await query;

  if (error) {
    return { rows: [], total: 0, error: error.message };
  }

  return { rows: (data ?? []) as ContactRow[], total: count ?? 0, error: null };
}
