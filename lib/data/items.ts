import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyContext } from "@/lib/data/company-context";

export type ItemQueryParams = {
  page: number;
  pageSize: number;
  search: string;
  sortBy: "name" | "selling_price" | "created_at";
  sortDir: "asc" | "desc";
  type: "all" | "goods" | "service";
};

export type ItemRow = {
  id: string;
  name: string;
  item_type: "goods" | "service";
  selling_price: number;
  cost_price: number;
  created_at: string;
};

export async function getItems(params: ItemQueryParams) {
  const { companyId, error: contextError } = await getActiveCompanyContext();

  if (!companyId) {
    return { rows: [], total: 0, error: contextError ?? "Missing company context." };
  }

  const supabase = await createClient();
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  let query = supabase
    .from("items")
    .select("id, name, item_type, selling_price, cost_price, created_at", { count: "exact" })
    .eq("company_id", companyId)
    .order(params.sortBy, { ascending: params.sortDir === "asc" })
    .range(from, to);

  if (params.search) {
    query = query.ilike("name", `%${params.search}%`);
  }

  if (params.type !== "all") {
    query = query.eq("item_type", params.type);
  }

  const { data, count, error } = await query;

  if (error) {
    return { rows: [], total: 0, error: error.message };
  }

  return { rows: (data ?? []) as ItemRow[], total: count ?? 0, error: null };
}
