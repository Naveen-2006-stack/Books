import Link from "next/link";

type Props = {
  basePath: "/contacts" | "/items" | "/sales";
  page: number;
  pageSize: number;
  total: number;
  search: string;
  sortBy: string;
  sortDir: "asc" | "desc";
  filterValue: string;
  filterKey?: string;
};

function buildHref(basePath: string, params: Record<string, string | number>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => query.set(key, String(value)));
  return `${basePath}?${query.toString()}`;
}

export function TableQueryControls({
  basePath,
  page,
  pageSize,
  total,
  search,
  sortBy,
  sortDir,
  filterValue,
  filterKey = "type",
}: Props) {
  const maxPage = Math.max(1, Math.ceil(total / pageSize));

  const sharedParams = {
    pageSize,
    search,
    sortBy,
    sortDir,
    [filterKey]: filterValue,
  };

  const prevHref = buildHref(basePath, {
    page: Math.max(1, page - 1),
    ...sharedParams,
  });

  const nextHref = buildHref(basePath, {
    page: Math.min(maxPage, page + 1),
    ...sharedParams,
  });

  return (
    <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
      <p>
        Page {page} of {maxPage} · {total} records
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={prevHref}
          className={`rounded-md border px-3 py-1.5 ${page <= 1 ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 hover:bg-slate-50"}`}
        >
          Previous
        </Link>
        <Link
          href={nextHref}
          className={`rounded-md border px-3 py-1.5 ${page >= maxPage ? "pointer-events-none border-slate-100 text-slate-300" : "border-slate-200 hover:bg-slate-50"}`}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
