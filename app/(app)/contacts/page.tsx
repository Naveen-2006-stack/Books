import { ContactCreateForm } from "@/components/forms/contact-create-form";
import { DeleteContactButton } from "@/components/tables/delete-contact-button";
import { TableQueryControls } from "@/components/tables/table-query-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getContacts } from "@/lib/data/contacts";

type ContactsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const params = (await searchParams) ?? {};

  const page = Number(params.page ?? 1) || 1;
  const pageSize = Number(params.pageSize ?? 10) || 10;
  const search = String(params.search ?? "");
  const sortBy = (String(params.sortBy ?? "created_at") as "display_name" | "created_at");
  const sortDir = (String(params.sortDir ?? "desc") as "asc" | "desc");
  const type = (String(params.type ?? "all") as "all" | "customer" | "vendor" | "both");

  const { rows, total, error } = await getContacts({
    page,
    pageSize,
    search,
    sortBy,
    sortDir,
    type,
  });

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          <ContactCreateForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customer & Vendor Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="mb-4 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-5">
            <input name="search" defaultValue={search} placeholder="Search name or email" className="rounded-md border border-slate-200 px-3 py-2 text-sm" />
            <select name="type" defaultValue={type} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
              <option value="all">All types</option>
              <option value="customer">Customer</option>
              <option value="vendor">Vendor</option>
              <option value="both">Both</option>
            </select>
            <select name="sortBy" defaultValue={sortBy} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
              <option value="created_at">Sort: Created</option>
              <option value="display_name">Sort: Name</option>
            </select>
            <select name="sortDir" defaultValue={sortDir} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
            <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white">Apply</button>
            <input type="hidden" name="page" value="1" />
            <input type="hidden" name="pageSize" value={String(pageSize)} />
          </form>

          {error ? <p className="mb-3 text-sm text-rose-700">{error}</p> : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Email</th>
                  <th className="pb-2">Phone</th>
                  <th className="pb-2">Created</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="py-3 font-medium text-slate-900">{row.display_name}</td>
                    <td className="py-3">
                      <Badge>{row.contact_type}</Badge>
                    </td>
                    <td className="py-3 text-slate-600">{row.email ?? "-"}</td>
                    <td className="py-3 text-slate-600">{row.phone ?? "-"}</td>
                    <td className="py-3 text-slate-600">{new Date(row.created_at).toLocaleDateString()}</td>
                    <td className="py-3 text-right">
                      <DeleteContactButton contactId={row.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <TableQueryControls
            basePath="/contacts"
            page={page}
            pageSize={pageSize}
            total={total}
            search={search}
            sortBy={sortBy}
            sortDir={sortDir}
            filterValue={type}
          />
        </CardContent>
      </Card>
    </div>
  );
}
