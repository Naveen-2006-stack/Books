import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyContext } from "@/lib/data/company-context";

type PurchaseStatus = "draft" | "sent" | "partially_paid" | "paid" | "void" | "cancelled";

export type PurchaseBillRow = {
  id: string;
  billNumber: string;
  vendorName: string;
  billDate: string;
  dueDate: string;
  status: PurchaseStatus;
  total: number;
  amountPaid: number;
  amountDue: number;
  notes: string | null;
};

export type PurchaseExpenseRow = {
  id: string;
  description: string;
  vendorName: string;
  expenseAccountName: string;
  paymentAccountName: string;
  expenseDate: string;
  amount: number;
  notes: string | null;
};

export type PurchaseSummary = {
  currency: string;
  outstandingBills: number;
  monthlySpend: number;
  overdueBills: number;
  activeVendors: number;
};

export type PurchaseFormDependencies = {
  currency: string;
  vendors: Array<{ id: string; display_name: string }>;
  expenseAccounts: Array<{ id: string; code: string; name: string }>;
  paymentAccounts: Array<{ id: string; code: string; name: string }>;
  error: string | null;
};

export type PurchasesOverview = {
  summary: PurchaseSummary;
  bills: PurchaseBillRow[];
  expenses: PurchaseExpenseRow[];
  error: string | null;
};

type BillRow = {
  id: string;
  vendor_id: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  status: PurchaseStatus;
  total: number;
  amount_paid: number;
  amount_due: number;
  notes: string | null;
  created_at: string;
};

type ExpenseRow = {
  id: string;
  vendor_id: string | null;
  expense_account_id: string;
  payment_account_id: string;
  description: string;
  amount: number;
  expense_date: string;
  notes: string | null;
};

type PaymentRow = {
  amount: number;
  payment_date: string;
};

const demoOverview: PurchasesOverview = {
  summary: {
    currency: "USD",
    outstandingBills: 8920,
    monthlySpend: 6180,
    overdueBills: 3,
    activeVendors: 8,
  },
  bills: [
    { id: "demo-b1", billNumber: "BILL-1021", vendorName: "Paper & Co", billDate: "2026-04-02", dueDate: "2026-04-16", status: "sent", total: 1260, amountPaid: 0, amountDue: 1260, notes: "Office paper and supplies" },
    { id: "demo-b2", billNumber: "BILL-1022", vendorName: "CloudStack", billDate: "2026-03-28", dueDate: "2026-04-12", status: "partially_paid", total: 2440, amountPaid: 800, amountDue: 1640, notes: "Annual hosting renewal" },
    { id: "demo-b3", billNumber: "BILL-1023", vendorName: "Northwind Studio", billDate: "2026-03-25", dueDate: "2026-04-05", status: "sent", total: 3520, amountPaid: 0, amountDue: 3520, notes: "Contract design work" },
  ],
  expenses: [
    { id: "demo-e1", description: "Domain renewals", vendorName: "Cloudflare", expenseAccountName: "Software Subscriptions", paymentAccountName: "Operating Cash", expenseDate: "2026-04-03", amount: 180, notes: "Annual renewal" },
    { id: "demo-e2", description: "Client lunch", vendorName: "Bistro", expenseAccountName: "Travel & Meals", paymentAccountName: "Operating Cash", expenseDate: "2026-04-04", amount: 62, notes: null },
    { id: "demo-e3", description: "Contractor milestone", vendorName: "Northwind Studio", expenseAccountName: "Contractor Payments", paymentAccountName: "Operating Cash", expenseDate: "2026-04-05", amount: 980, notes: "UI refresh milestone" },
  ],
  error: null,
};

const demoDependencies: PurchaseFormDependencies = {
  currency: "USD",
  vendors: [
    { id: "vendor-1", display_name: "Paper & Co" },
    { id: "vendor-2", display_name: "CloudStack" },
    { id: "vendor-3", display_name: "Northwind Studio" },
  ],
  expenseAccounts: [
    { id: "expense-1", code: "6100", name: "Software Subscriptions" },
    { id: "expense-2", code: "6200", name: "Contractor Payments" },
    { id: "expense-3", code: "6300", name: "Travel & Meals" },
  ],
  paymentAccounts: [
    { id: "asset-1", code: "1000", name: "Operating Cash" },
    { id: "asset-2", code: "1010", name: "Bank Checking" },
  ],
  error: null,
};

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isOpenStatus(status: PurchaseStatus) {
  return status !== "void" && status !== "cancelled";
}

function sum(values: Array<number | null | undefined>) {
  return values.reduce<number>((total, value) => total + Number(value ?? 0), 0);
}

async function loadPurchasesData() {
  const { companyId, error: contextError } = await getActiveCompanyContext();

  if (!companyId) {
    return { overview: demoOverview, dependencies: demoDependencies };
  }

  const supabase = await createClient();
  const currentMonthStart = startOfMonth(new Date());

  const [companyResult, billsResult, expensesResult, billPaymentsResult] = await Promise.all([
    supabase.from("companies").select("base_currency").eq("id", companyId).maybeSingle(),
    supabase
      .from("bills")
      .select("id, vendor_id, bill_number, bill_date, due_date, status, total, amount_paid, amount_due, notes, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase
      .from("expenses")
      .select("id, vendor_id, expense_account_id, payment_account_id, description, amount, expense_date, notes")
      .eq("company_id", companyId)
      .order("expense_date", { ascending: false }),
    supabase
      .from("bill_payments")
      .select("amount, payment_date")
      .eq("company_id", companyId)
      .gte("payment_date", formatDate(currentMonthStart)),
  ]);

  const firstError = companyResult.error ?? billsResult.error ?? expensesResult.error ?? billPaymentsResult.error;

  if (firstError) {
    return {
      overview: {
        ...demoOverview,
        summary: {
          ...demoOverview.summary,
          currency: companyResult.data?.base_currency ?? "USD",
        },
        error: firstError.message ?? contextError ?? "Unable to load purchases data.",
      },
      dependencies: {
        ...demoDependencies,
        currency: companyResult.data?.base_currency ?? "USD",
        error: firstError.message,
      },
    };
  }

  const bills = (billsResult.data ?? []) as BillRow[];
  const expenses = (expensesResult.data ?? []) as ExpenseRow[];
  const billPayments = (billPaymentsResult.data ?? []) as PaymentRow[];

  const [vendorsResult, expenseAccountsResult, paymentAccountsResult] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, display_name")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .in("contact_type", ["vendor", "both"])
      .order("display_name", { ascending: true }),
    supabase
      .from("accounts")
      .select("id, code, name")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .eq("category", "expense")
      .order("code", { ascending: true }),
    supabase
      .from("accounts")
      .select("id, code, name")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .eq("category", "asset")
      .order("code", { ascending: true }),
  ]);

  const mappingError = vendorsResult.error ?? expenseAccountsResult.error ?? paymentAccountsResult.error;

  if (mappingError) {
    return {
      overview: {
        ...demoOverview,
        summary: {
          ...demoOverview.summary,
          currency: companyResult.data?.base_currency ?? "USD",
        },
        error: mappingError.message,
      },
      dependencies: {
        ...demoDependencies,
        currency: companyResult.data?.base_currency ?? "USD",
        error: mappingError.message,
      },
    };
  }

  const vendorList = (vendorsResult.data ?? []) as Array<{ id: string; display_name: string }>;
  const expenseAccountList = (expenseAccountsResult.data ?? []) as Array<{ id: string; code: string; name: string }>;
  const paymentAccountList = (paymentAccountsResult.data ?? []) as Array<{ id: string; code: string; name: string }>;

  const vendorNameById = new Map(vendorList.map((vendor) => [vendor.id, vendor.display_name]));
  const expenseAccountNameById = new Map(expenseAccountList.map((account) => [account.id, account.name]));
  const paymentAccountNameById = new Map(paymentAccountList.map((account) => [account.id, account.name]));

  const outstandingBills = sum(bills.filter((row) => isOpenStatus(row.status)).map((row) => Number(row.amount_due ?? 0)));
  const overdueBills = bills.filter((row) => isOpenStatus(row.status) && row.amount_due > 0 && new Date(row.due_date) < new Date()).length;
  const monthlySpend = sum([
    ...billPayments.map((row) => Number(row.amount ?? 0)),
    ...expenses.filter((row) => new Date(row.expense_date) >= currentMonthStart).map((row) => Number(row.amount ?? 0)),
  ]);

  const overview: PurchasesOverview = {
    summary: {
      currency: companyResult.data?.base_currency ?? "USD",
      outstandingBills,
      monthlySpend,
      overdueBills,
      activeVendors: vendorList.length,
    },
    bills: bills.slice(0, 6).map((row) => ({
      id: row.id,
      billNumber: row.bill_number,
      vendorName: vendorNameById.get(row.vendor_id) ?? "Unknown vendor",
      billDate: row.bill_date,
      dueDate: row.due_date,
      status: row.status,
      total: Number(row.total ?? 0),
      amountPaid: Number(row.amount_paid ?? 0),
      amountDue: Number(row.amount_due ?? 0),
      notes: row.notes,
    })),
    expenses: expenses.slice(0, 6).map((row) => ({
      id: row.id,
      description: row.description,
      vendorName: row.vendor_id ? vendorNameById.get(row.vendor_id) ?? "Unknown vendor" : "No vendor",
      expenseAccountName: expenseAccountNameById.get(row.expense_account_id) ?? "Expense account",
      paymentAccountName: paymentAccountNameById.get(row.payment_account_id) ?? "Payment account",
      expenseDate: row.expense_date,
      amount: Number(row.amount ?? 0),
      notes: row.notes,
    })),
    error: null,
  };

  const dependencies: PurchaseFormDependencies = {
    currency: companyResult.data?.base_currency ?? "USD",
    vendors: vendorList,
    expenseAccounts: expenseAccountList,
    paymentAccounts: paymentAccountList,
    error: null,
  };

  return { overview, dependencies };
}

export async function getPurchasesOverview() {
  const { overview } = await loadPurchasesData();
  return overview;
}

export async function getPurchaseFormDependencies() {
  const { dependencies } = await loadPurchasesData();
  return dependencies;
}