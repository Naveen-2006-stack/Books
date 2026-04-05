import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyContext } from "@/lib/data/company-context";

type InvoiceStatus = "draft" | "sent" | "partially_paid" | "paid" | "void" | "cancelled";

export type DashboardKpi = {
  title: string;
  value: number;
  delta: string;
  trend: "up" | "down";
};

export type CashflowPoint = {
  month: string;
  income: number;
  expense: number;
};

export type RecentInvoiceRow = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  dueDate: string;
  status: InvoiceStatus;
  amount: number;
  amountPaid: number;
  amountDue: number;
};

export type TopExpenseRow = {
  category: string;
  amount: number;
  share: number;
};

export type DashboardOverview = {
  currency: string;
  kpis: DashboardKpi[];
  cashflow: CashflowPoint[];
  recentInvoices: RecentInvoiceRow[];
  topExpenses: TopExpenseRow[];
  error: string | null;
};

type InvoiceRow = {
  id: string;
  customer_id: string;
  invoice_number: string;
  due_date: string;
  issue_date: string;
  status: InvoiceStatus;
  total: number;
  amount_paid: number;
  amount_due: number;
  tax_total: number;
  created_at: string;
};

type BillRow = {
  id: string;
  vendor_id: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  status: InvoiceStatus;
  total: number;
  amount_paid: number;
  amount_due: number;
  created_at: string;
};

type ExpenseRow = {
  id: string;
  vendor_id: string | null;
  expense_account_id: string;
  description: string;
  amount: number;
  expense_date: string;
  notes: string | null;
};

type InvoicePaymentRow = {
  payment_date: string;
  amount: number;
};

type BillPaymentRow = {
  payment_date: string;
  amount: number;
};

const demoOverview: DashboardOverview = {
  currency: "USD",
  kpis: [
    { title: "Total Receivables", value: 12840, delta: "+7.4% vs last month", trend: "up" },
    { title: "Total Payables", value: 8920, delta: "-2.1% vs last month", trend: "down" },
    { title: "Net Cashflow", value: 4410, delta: "+11.8% vs last month", trend: "up" },
    { title: "Tax Reserve", value: 1240, delta: "Open tax liability", trend: "up" },
  ],
  cashflow: [
    { month: "Nov", income: 4800, expense: 2900 },
    { month: "Dec", income: 5200, expense: 3100 },
    { month: "Jan", income: 6100, expense: 3900 },
    { month: "Feb", income: 5600, expense: 3300 },
    { month: "Mar", income: 6700, expense: 4200 },
    { month: "Apr", income: 7300, expense: 4600 },
  ],
  recentInvoices: [
    { id: "demo-1", invoiceNumber: "INV-2031", customerName: "Blue Finch Studio", dueDate: "2026-04-10", status: "paid", amount: 1600, amountPaid: 1600, amountDue: 0 },
    { id: "demo-2", invoiceNumber: "INV-2032", customerName: "Northwind Labs", dueDate: "2026-04-14", status: "sent", amount: 2450, amountPaid: 0, amountDue: 2450 },
    { id: "demo-3", invoiceNumber: "INV-2033", customerName: "Nexa Analytics", dueDate: "2026-04-18", status: "partially_paid", amount: 980, amountPaid: 300, amountDue: 680 },
    { id: "demo-4", invoiceNumber: "INV-2034", customerName: "Evergreen Commerce", dueDate: "2026-04-22", status: "draft", amount: 740, amountPaid: 0, amountDue: 740 },
  ],
  topExpenses: [
    { category: "Software Subscriptions", amount: 1280, share: 28 },
    { category: "Contractor Payments", amount: 980, share: 21 },
    { category: "Office & Internet", amount: 620, share: 14 },
    { category: "Travel & Meals", amount: 430, share: 9 },
  ],
  error: null,
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short" });
}

function buildMonths(count: number, anchorDate = new Date()) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - (count - 1 - index), 1);
    return { key: monthKey(date), label: monthLabel(date) };
  });
}

function formatDelta(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? "Flat vs last month" : "New vs last month";
  }

  const change = ((current - previous) / previous) * 100;
  const prefix = change > 0 ? "+" : "";
  return `${prefix}${change.toFixed(1)}% vs last month`;
}

function sum(values: Array<number | null | undefined>) {
  return values.reduce<number>((total, value) => total + Number(value ?? 0), 0);
}

function isOpenStatus(status: InvoiceStatus) {
  return status !== "void" && status !== "cancelled";
}

async function loadLiveDashboard() {
  const { companyId, error: contextError } = await getActiveCompanyContext();

  if (!companyId) {
    return demoOverview;
  }

  const supabase = await createClient();
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const previousMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const sixMonthsAgo = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 5, 1));

  const [companyResult, invoicesResult, billsResult, expensesResult, invoicePaymentsResult, billPaymentsResult] = await Promise.all([
    supabase.from("companies").select("base_currency").eq("id", companyId).maybeSingle(),
    supabase
      .from("invoices")
      .select("id, customer_id, invoice_number, due_date, issue_date, status, total, amount_paid, amount_due, tax_total, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("bills")
      .select("id, vendor_id, bill_number, bill_date, due_date, status, total, amount_paid, amount_due, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("expenses")
      .select("id, vendor_id, expense_account_id, description, amount, expense_date, notes")
      .eq("company_id", companyId)
      .gte("expense_date", sixMonthsAgo.toISOString().slice(0, 10))
      .order("expense_date", { ascending: false }),
    supabase
      .from("invoice_payments")
      .select("payment_date, amount")
      .eq("company_id", companyId)
      .gte("payment_date", sixMonthsAgo.toISOString().slice(0, 10)),
    supabase
      .from("bill_payments")
      .select("payment_date, amount")
      .eq("company_id", companyId)
      .gte("payment_date", sixMonthsAgo.toISOString().slice(0, 10)),
  ]);

  const firstError =
    companyResult.error ?? invoicesResult.error ?? billsResult.error ?? expensesResult.error ?? invoicePaymentsResult.error ?? billPaymentsResult.error;

  if (firstError) {
    return {
      currency: companyResult.data?.base_currency ?? "USD",
      kpis: demoOverview.kpis,
      cashflow: demoOverview.cashflow,
      recentInvoices: demoOverview.recentInvoices,
      topExpenses: demoOverview.topExpenses,
      error: firstError.message ?? contextError ?? "Unable to load dashboard data.",
    } satisfies DashboardOverview;
  }

  const currency = companyResult.data?.base_currency ?? "USD";
  const invoices = (invoicesResult.data ?? []) as InvoiceRow[];
  const bills = (billsResult.data ?? []) as BillRow[];
  const expenses = (expensesResult.data ?? []) as ExpenseRow[];
  const invoicePayments = (invoicePaymentsResult.data ?? []) as InvoicePaymentRow[];
  const billPayments = (billPaymentsResult.data ?? []) as BillPaymentRow[];

  const customerIds = Array.from(new Set(invoices.map((row) => row.customer_id)));
  const vendorIds = Array.from(new Set([...bills.map((row) => row.vendor_id), ...expenses.map((row) => row.vendor_id).filter(Boolean)]));
  const expenseAccountIds = Array.from(new Set(expenses.map((row) => row.expense_account_id)));

  const [customersResult, vendorsResult, accountsResult] = await Promise.all([
    customerIds.length > 0
      ? supabase.from("contacts").select("id, display_name").eq("company_id", companyId).in("id", customerIds)
      : Promise.resolve({ data: [], error: null }),
    vendorIds.length > 0
      ? supabase.from("contacts").select("id, display_name").eq("company_id", companyId).in("id", vendorIds as string[])
      : Promise.resolve({ data: [], error: null }),
    expenseAccountIds.length > 0
      ? supabase.from("accounts").select("id, name").eq("company_id", companyId).in("id", expenseAccountIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const mappingError = customersResult.error ?? vendorsResult.error ?? accountsResult.error;

  if (mappingError) {
    return {
      currency,
      kpis: demoOverview.kpis,
      cashflow: demoOverview.cashflow,
      recentInvoices: demoOverview.recentInvoices,
      topExpenses: demoOverview.topExpenses,
      error: mappingError.message,
    } satisfies DashboardOverview;
  }

  const customerContacts = (customersResult.data ?? []) as Array<{ id: string; display_name: string }>;
  const expenseAccounts = (accountsResult.data ?? []) as Array<{ id: string; name: string }>;

  const customerNameById = new Map<string, string>(customerContacts.map((contact) => [contact.id, contact.display_name]));
  const accountNameById = new Map<string, string>(expenseAccounts.map((account) => [account.id, account.name]));

  const currentReceivables = sum(
    invoices.filter((row) => isOpenStatus(row.status)).map((row) => Number(row.amount_due ?? 0)),
  );
  const previousReceivables = sum(
    invoices
      .filter((row) => isOpenStatus(row.status) && new Date(row.issue_date) < currentMonthStart)
      .map((row) => Number(row.amount_due ?? 0)),
  );

  const currentPayables = sum(
    bills.filter((row) => isOpenStatus(row.status)).map((row) => Number(row.amount_due ?? 0)),
  );
  const previousPayables = sum(
    bills
      .filter((row) => isOpenStatus(row.status) && new Date(row.bill_date) < currentMonthStart)
      .map((row) => Number(row.amount_due ?? 0)),
  );

  const currentTaxReserve = sum(
    invoices.filter((row) => isOpenStatus(row.status)).map((row) => Number(row.tax_total ?? 0)),
  );
  const previousTaxReserve = sum(
    invoices
      .filter((row) => isOpenStatus(row.status) && new Date(row.issue_date) < currentMonthStart)
      .map((row) => Number(row.tax_total ?? 0)),
  );

  const currentMonthIncome = sum(
    invoicePayments.filter((row) => new Date(row.payment_date) >= currentMonthStart).map((row) => Number(row.amount ?? 0)),
  );
  const currentMonthExpense = sum(
    [...billPayments, ...expenses]
      .filter((row) => new Date("payment_date" in row ? row.payment_date : row.expense_date) >= currentMonthStart)
      .map((row) => Number(row.amount ?? 0)),
  );
  const previousMonthIncome = sum(
    invoicePayments
      .filter((row) => new Date(row.payment_date) >= previousMonthStart && new Date(row.payment_date) < currentMonthStart)
      .map((row) => Number(row.amount ?? 0)),
  );
  const previousMonthExpense = sum(
    [...billPayments, ...expenses]
      .filter((row) => {
        const date = "payment_date" in row ? new Date(row.payment_date) : new Date(row.expense_date);
        return date >= previousMonthStart && date < currentMonthStart;
      })
      .map((row) => Number(row.amount ?? 0)),
  );

  const months = buildMonths(6, now);
  const monthSeries = new Map<string, CashflowPoint>(months.map((item) => [item.key, { month: item.label, income: 0, expense: 0 }]));

  for (const row of invoicePayments) {
    const key = monthKey(new Date(row.payment_date));
    const bucket = monthSeries.get(key);
    if (bucket) {
      bucket.income += Number(row.amount ?? 0);
    }
  }

  for (const row of billPayments) {
    const key = monthKey(new Date(row.payment_date));
    const bucket = monthSeries.get(key);
    if (bucket) {
      bucket.expense += Number(row.amount ?? 0);
    }
  }

  for (const row of expenses) {
    const key = monthKey(new Date(row.expense_date));
    const bucket = monthSeries.get(key);
    if (bucket) {
      bucket.expense += Number(row.amount ?? 0);
    }
  }

  const totalCurrentExpense = currentMonthExpense;
  const topExpenses = Array.from(
    expenses.reduce((map, row) => {
      const category = accountNameById.get(row.expense_account_id) ?? row.description;
      const current = map.get(category) ?? 0;
      map.set(category, current + Number(row.amount ?? 0));
      return map;
    }, new Map<string, number>()),
  )
    .map(([category, amount]) => ({
      category,
      amount,
      share: totalCurrentExpense > 0 ? Math.round((amount / totalCurrentExpense) * 100) : 0,
    }))
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 4);

  const recentInvoices: RecentInvoiceRow[] = invoices.slice(0, 4).map((row) => ({
    id: row.id,
    invoiceNumber: row.invoice_number,
    customerName: customerNameById.get(row.customer_id) ?? "Unknown customer",
    dueDate: row.due_date,
    status: row.status,
    amount: Number(row.total ?? 0),
    amountPaid: Number(row.amount_paid ?? 0),
    amountDue: Number(row.amount_due ?? 0),
  }));

  const kpis: DashboardKpi[] = [
    {
      title: "Total Receivables",
      value: currentReceivables,
      delta: formatDelta(currentReceivables, previousReceivables),
      trend: currentReceivables >= previousReceivables ? "up" : "down",
    },
    {
      title: "Total Payables",
      value: currentPayables,
      delta: formatDelta(currentPayables, previousPayables),
      trend: currentPayables <= previousPayables ? "down" : "up",
    },
    {
      title: "Net Cashflow",
      value: currentMonthIncome - currentMonthExpense,
      delta: formatDelta(currentMonthIncome - currentMonthExpense, previousMonthIncome - previousMonthExpense),
      trend: currentMonthIncome - currentMonthExpense >= previousMonthIncome - previousMonthExpense ? "up" : "down",
    },
    {
      title: "Tax Reserve",
      value: currentTaxReserve,
      delta: formatDelta(currentTaxReserve, previousTaxReserve),
      trend: currentTaxReserve <= previousTaxReserve ? "down" : "up",
    },
  ];

  return {
    currency,
    kpis,
    cashflow: months.map(({ key, label }) => monthSeries.get(key) ?? { month: label, income: 0, expense: 0 }),
    recentInvoices,
    topExpenses,
    error: null,
  } satisfies DashboardOverview;
}

export async function getDashboardOverview() {
  return loadLiveDashboard();
}