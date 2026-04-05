import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyContext } from "@/lib/data/company-context";

type AccountCategory = "asset" | "liability" | "equity" | "income" | "expense";

type AccountRow = {
  id: string;
  code: string;
  name: string;
  category: AccountCategory;
  is_active: boolean;
  created_at: string;
};

type LedgerRow = {
  journal_entry_id: string;
  account_id: string;
  debit: number;
  credit: number;
  description: string | null;
  line_no: number;
};

type JournalRow = {
  id: string;
  entry_number: number;
  entry_date: string;
  source_type: string;
  source_id: string | null;
  memo: string | null;
  posted_at: string;
};

type BalanceRow = {
  accountId: string;
  code: string;
  name: string;
  category: AccountCategory;
  isActive: boolean;
  debit: number;
  credit: number;
  balance: number;
};

type JournalLedgerLine = {
  lineNo: number;
  accountId: string;
  accountCode: string;
  accountName: string;
  category: AccountCategory;
  description: string | null;
  debit: number;
  credit: number;
};

type JournalLedgerEntry = {
  id: string;
  entryNumber: number;
  entryDate: string;
  sourceType: string;
  sourceId: string | null;
  memo: string | null;
  postedAt: string;
  totalDebit: number;
  totalCredit: number;
  lines: JournalLedgerLine[];
};

async function loadAccountingData(journalLimit = 12) {
  const { companyId, error: contextError } = await getActiveCompanyContext();

  if (!companyId) {
    return {
      companyId: null as string | null,
      currency: "USD",
      error: contextError ?? "Missing company context.",
      accounts: [] as AccountRow[],
      balances: [] as BalanceRow[],
      journals: [] as JournalLedgerEntry[],
    };
  }

  const supabase = await createClient();

  const [{ data: company, error: companyError }, { data: accounts, error: accountError }] = await Promise.all([
    supabase.from("companies").select("base_currency").eq("id", companyId).maybeSingle(),
    supabase.from("accounts").select("id, code, name, category, is_active, created_at").eq("company_id", companyId).order("code", { ascending: true }),
  ]);

  const firstError = companyError ?? accountError;

  if (firstError) {
    return {
      companyId,
      currency: company?.base_currency ?? "USD",
      error: firstError.message,
      accounts: [] as AccountRow[],
      balances: [] as BalanceRow[],
      journals: [] as JournalLedgerEntry[],
    };
  }

  const accountRows = (accounts ?? []) as AccountRow[];
  const journalRows: JournalRow[] = [];

  if (journalLimit > 0) {
    const { data: journals, error: journalError } = await supabase
      .from("journal_entries")
      .select("id, entry_number, entry_date, source_type, source_id, memo, posted_at")
      .eq("company_id", companyId)
      .order("entry_date", { ascending: false })
      .order("posted_at", { ascending: false })
      .range(0, journalLimit - 1);

    if (journalError) {
      return {
        companyId,
        currency: company?.base_currency ?? "USD",
        error: journalError.message,
        accounts: [] as AccountRow[],
        balances: [] as BalanceRow[],
        journals: [] as JournalLedgerEntry[],
      };
    }

    journalRows.push(...((journals ?? []) as JournalRow[]));
  }

  const journalIds = journalRows.map((row) => row.id);
  let ledgerRows: LedgerRow[] = [];

  if (journalIds.length > 0) {
    const { data: ledger, error: ledgerError } = await supabase
      .from("general_ledger")
      .select("journal_entry_id, account_id, debit, credit, description, line_no")
      .eq("company_id", companyId)
      .in("journal_entry_id", journalIds)
      .order("line_no", { ascending: true });

    if (ledgerError) {
      return {
        companyId,
        currency: company?.base_currency ?? "USD",
        error: ledgerError.message,
        accounts: [] as AccountRow[],
        balances: [] as BalanceRow[],
        journals: [] as JournalLedgerEntry[],
      };
    }

    ledgerRows = (ledger ?? []) as LedgerRow[];
  }

  const accountById = new Map(accountRows.map((row) => [row.id, row]));
  const totalsByAccount = new Map<string, { debit: number; credit: number }>();
  const linesByJournal = new Map<string, JournalLedgerLine[]>();

  for (const row of ledgerRows) {
    const current = totalsByAccount.get(row.account_id) ?? { debit: 0, credit: 0 };
    current.debit += Number(row.debit ?? 0);
    current.credit += Number(row.credit ?? 0);
    totalsByAccount.set(row.account_id, current);

    const account = accountById.get(row.account_id);
    if (!account) {
      continue;
    }

    const lines = linesByJournal.get(row.journal_entry_id) ?? [];
    lines.push({
      lineNo: row.line_no,
      accountId: row.account_id,
      accountCode: account.code,
      accountName: account.name,
      category: account.category,
      description: row.description,
      debit: Number(row.debit ?? 0),
      credit: Number(row.credit ?? 0),
    });
    linesByJournal.set(row.journal_entry_id, lines);
  }

  const balances: BalanceRow[] = accountRows.map((account) => {
    const totals = totalsByAccount.get(account.id) ?? { debit: 0, credit: 0 };

    return {
      accountId: account.id,
      code: account.code,
      name: account.name,
      category: account.category,
      isActive: account.is_active,
      debit: totals.debit,
      credit: totals.credit,
      balance: totals.debit - totals.credit,
    };
  });

  const journals: JournalLedgerEntry[] = journalRows.map((journal) => {
    const lines = (linesByJournal.get(journal.id) ?? []).sort((left, right) => left.lineNo - right.lineNo);
    const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);

    return {
      id: journal.id,
      entryNumber: journal.entry_number,
      entryDate: journal.entry_date,
      sourceType: journal.source_type,
      sourceId: journal.source_id,
      memo: journal.memo,
      postedAt: journal.posted_at,
      totalDebit,
      totalCredit,
      lines,
    };
  });

  return {
    companyId,
    currency: company?.base_currency ?? "USD",
    error: null,
    accounts: accountRows,
    balances,
    journals,
  };
}

function getCategoryTotals(rows: BalanceRow[]) {
  const totals: Record<AccountCategory, number> = {
    asset: 0,
    liability: 0,
    equity: 0,
    income: 0,
    expense: 0,
  };

  for (const row of rows) {
    if (row.category === "asset" || row.category === "expense") {
      totals[row.category] += row.balance;
    } else {
      totals[row.category] += row.credit - row.debit;
    }
  }

  return totals;
}

export async function getAccountingOverview() {
  const data = await loadAccountingData(8);

  if (data.error) {
    return {
      accountCount: 0,
      journalCount: 0,
      currency: data.currency,
      assetBalance: 0,
      liabilityBalance: 0,
      equityBalance: 0,
      incomeBalance: 0,
      expenseBalance: 0,
      netIncome: 0,
      recentJournals: [] as JournalLedgerEntry[],
      trialBalancePreview: [] as Array<{ accountId: string; code: string; name: string; debit: number; credit: number }>,
      error: data.error,
    };
  }

  const categoryTotals = getCategoryTotals(data.balances);
  const assetBalance = data.balances.filter((row) => row.category === "asset").reduce((sum, row) => sum + row.balance, 0);
  const liabilityBalance = data.balances.filter((row) => row.category === "liability").reduce((sum, row) => sum + (row.credit - row.debit), 0);
  const equityBalance = data.balances.filter((row) => row.category === "equity").reduce((sum, row) => sum + (row.credit - row.debit), 0);
  const incomeBalance = data.balances.filter((row) => row.category === "income").reduce((sum, row) => sum + (row.credit - row.debit), 0);
  const expenseBalance = data.balances.filter((row) => row.category === "expense").reduce((sum, row) => sum + row.balance, 0);

  return {
    accountCount: data.accounts.filter((row) => row.is_active).length,
    journalCount: data.journals.length,
    currency: data.currency,
    assetBalance,
    liabilityBalance,
    equityBalance,
    incomeBalance,
    expenseBalance,
    netIncome: categoryTotals.income - categoryTotals.expense,
    recentJournals: data.journals,
    trialBalancePreview: data.balances.slice(0, 5).map((row) => ({
      accountId: row.accountId,
      code: row.code,
      name: row.name,
      debit: row.debit,
      credit: row.credit,
    })),
    error: null,
  };
}

export async function getChartOfAccounts() {
  const data = await loadAccountingData(0);

  if (data.error) {
    return {
      currency: data.currency,
      rows: [] as BalanceRow[],
      totals: { debit: 0, credit: 0, balance: 0 },
      error: data.error,
    };
  }

  const totals = data.balances.reduce(
    (accumulator, row) => ({
      debit: accumulator.debit + row.debit,
      credit: accumulator.credit + row.credit,
      balance: accumulator.balance + row.balance,
    }),
    { debit: 0, credit: 0, balance: 0 },
  );

  return {
    currency: data.currency,
    rows: data.balances,
    totals,
    error: null,
  };
}

export async function getTrialBalance() {
  const data = await loadAccountingData(0);

  if (data.error) {
    return {
      currency: data.currency,
      rows: [] as Array<{ accountId: string; code: string; name: string; debit: number; credit: number; balance: number }>,
      totals: { debit: 0, credit: 0, balance: 0 },
      error: data.error,
    };
  }

  const rows = data.balances
    .filter((row) => row.debit !== 0 || row.credit !== 0)
    .map((row) => ({
      accountId: row.accountId,
      code: row.code,
      name: row.name,
      debit: row.debit,
      credit: row.credit,
      balance: row.balance,
    }));

  const totals = rows.reduce(
    (accumulator, row) => ({
      debit: accumulator.debit + row.debit,
      credit: accumulator.credit + row.credit,
      balance: accumulator.balance + row.balance,
    }),
    { debit: 0, credit: 0, balance: 0 },
  );

  return {
    currency: data.currency,
    rows,
    totals,
    error: null,
  };
}

export async function getJournalLedger() {
  const data = await loadAccountingData(20);

  if (data.error) {
    return {
      currency: data.currency,
      rows: [] as JournalLedgerEntry[],
      error: data.error,
    };
  }

  return {
    currency: data.currency,
    rows: data.journals,
    error: null,
  };
}