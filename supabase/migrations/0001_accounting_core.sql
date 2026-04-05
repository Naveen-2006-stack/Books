-- Step 1 database schema approved by user.
-- Paste the full SQL schema from Step 1 here before running migration.
-- Keeping this migration file in-repo ensures DB architecture is versioned with app code.
-- =========================================================
-- Step 1 - Database Architecture (Supabase Postgres)
-- Accounting + Bookkeeping with Double-Entry Ledger
-- =========================================================

-- ---------- Extensions ----------
create extension if not exists pgcrypto;

-- ---------- Enums ----------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'contact_type') then
    create type contact_type as enum ('customer', 'vendor', 'both');
  end if;

  if not exists (select 1 from pg_type where typname = 'item_type') then
    create type item_type as enum ('goods', 'service');
  end if;

  if not exists (select 1 from pg_type where typname = 'account_category') then
    create type account_category as enum ('asset', 'liability', 'equity', 'income', 'expense');
  end if;

  if not exists (select 1 from pg_type where typname = 'entry_source_type') then
    create type entry_source_type as enum (
      'invoice',
      'invoice_payment',
      'bill',
      'bill_payment',
      'expense',
      'manual_journal',
      'opening_balance',
      'system_adjustment'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'doc_status') then
    create type doc_status as enum ('draft', 'sent', 'partially_paid', 'paid', 'void', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'member_role') then
    create type member_role as enum ('owner', 'admin', 'bookkeeper', 'staff', 'viewer');
  end if;
end $$;

-- ---------- Utility ----------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------
-- Core tenancy and users
-- ---------------------------------------------------------

-- User profile (maps 1:1 with auth.users)
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_user_profiles_updated_at on public.user_profiles;
create trigger trg_user_profiles_updated_at
before update on public.user_profiles
for each row execute function set_updated_at();

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  display_name text not null,
  base_currency char(3) not null default 'USD',
  fiscal_year_start_month int not null default 1 check (fiscal_year_start_month between 1 and 12),
  country_code char(2),
  timezone text not null default 'UTC',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_companies_updated_at on public.companies;
create trigger trg_companies_updated_at
before update on public.companies
for each row execute function set_updated_at();

create table if not exists public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role member_role not null default 'staff',
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create index if not exists idx_company_members_user on public.company_members(user_id);

create table if not exists public.tax_rates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  rate_percent numeric(7,4) not null check (rate_percent >= 0 and rate_percent <= 100),
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);

drop trigger if exists trg_tax_rates_updated_at on public.tax_rates;
create trigger trg_tax_rates_updated_at
before update on public.tax_rates
for each row execute function set_updated_at();

-- ---------------------------------------------------------
-- Chart of Accounts + Accounting Engine
-- ---------------------------------------------------------

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  category account_category not null,
  subcategory text,
  parent_account_id uuid references public.accounts(id) on delete set null,
  is_system boolean not null default false,
  is_active boolean not null default true,
  allow_manual_entries boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code),
  unique (company_id, name)
);

create index if not exists idx_accounts_company_category on public.accounts(company_id, category);
create index if not exists idx_accounts_parent on public.accounts(parent_account_id);

drop trigger if exists trg_accounts_updated_at on public.accounts;
create trigger trg_accounts_updated_at
before update on public.accounts
for each row execute function set_updated_at();

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  entry_number bigint generated by default as identity,
  entry_date date not null default current_date,
  source_type entry_source_type not null,
  source_id uuid,
  memo text,
  posted_by uuid not null references auth.users(id) on delete restrict,
  posted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (company_id, entry_number)
);

create index if not exists idx_journal_entries_company_date on public.journal_entries(company_id, entry_date desc);
create index if not exists idx_journal_entries_source on public.journal_entries(company_id, source_type, source_id);

create table if not exists public.general_ledger (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  contact_id uuid,
  description text,
  debit numeric(14,2) not null default 0,
  credit numeric(14,2) not null default 0,
  line_no int not null default 1,
  created_at timestamptz not null default now(),
  check (debit >= 0 and credit >= 0),
  check (
    (debit > 0 and credit = 0)
    or
    (credit > 0 and debit = 0)
  ),
  unique (journal_entry_id, line_no)
);

create index if not exists idx_gl_company_account_date
on public.general_ledger(company_id, account_id, created_at desc);

create index if not exists idx_gl_journal on public.general_ledger(journal_entry_id);
create index if not exists idx_gl_contact on public.general_ledger(contact_id);

-- Ensure account belongs to same company as ledger row
create or replace function gl_account_company_guard()
returns trigger
language plpgsql
as $$
declare
  acc_company uuid;
begin
  select company_id into acc_company
  from public.accounts
  where id = new.account_id;

  if acc_company is null then
    raise exception 'Invalid account_id for general_ledger';
  end if;

  if acc_company <> new.company_id then
    raise exception 'Account company mismatch in general_ledger';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_gl_account_company_guard on public.general_ledger;
create trigger trg_gl_account_company_guard
before insert or update on public.general_ledger
for each row execute function gl_account_company_guard();

-- Ensure journal belongs to same company as ledger row
create or replace function gl_journal_company_guard()
returns trigger
language plpgsql
as $$
declare
  j_company uuid;
begin
  select company_id into j_company
  from public.journal_entries
  where id = new.journal_entry_id;

  if j_company is null then
    raise exception 'Invalid journal_entry_id for general_ledger';
  end if;

  if j_company <> new.company_id then
    raise exception 'Journal company mismatch in general_ledger';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_gl_journal_company_guard on public.general_ledger;
create trigger trg_gl_journal_company_guard
before insert or update on public.general_ledger
for each row execute function gl_journal_company_guard();

-- Enforce balanced journal entries (sum(debit) = sum(credit))
create or replace function validate_journal_balance()
returns trigger
language plpgsql
as $$
declare
  v_journal_id uuid;
  v_diff numeric(14,2);
begin
  v_journal_id := coalesce(new.journal_entry_id, old.journal_entry_id);

  select coalesce(sum(debit), 0) - coalesce(sum(credit), 0)
  into v_diff
  from public.general_ledger
  where journal_entry_id = v_journal_id;

  if v_diff <> 0 then
    raise exception 'Unbalanced journal entry: % (debit-credit = %)', v_journal_id, v_diff;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_validate_journal_balance on public.general_ledger;
create constraint trigger trg_validate_journal_balance
after insert or update or delete on public.general_ledger
deferrable initially deferred
for each row execute function validate_journal_balance();

-- ---------------------------------------------------------
-- Contacts and Items
-- ---------------------------------------------------------

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  contact_type contact_type not null,
  display_name text not null,
  company_name text,
  email text,
  phone text,
  billing_address jsonb not null default '{}'::jsonb,
  shipping_address jsonb not null default '{}'::jsonb,
  tax_number text,
  opening_balance numeric(14,2) not null default 0,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, display_name)
);

create index if not exists idx_contacts_company_type on public.contacts(company_id, contact_type);
create index if not exists idx_contacts_company_active on public.contacts(company_id, is_active);

drop trigger if exists trg_contacts_updated_at on public.contacts;
create trigger trg_contacts_updated_at
before update on public.contacts
for each row execute function set_updated_at();

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  item_type item_type not null,
  sku text,
  name text not null,
  description text,
  unit text not null default 'unit',
  selling_price numeric(14,2) not null default 0,
  cost_price numeric(14,2) not null default 0,
  income_account_id uuid references public.accounts(id) on delete restrict,
  expense_account_id uuid references public.accounts(id) on delete restrict,
  tax_rate_id uuid references public.tax_rates(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, sku),
  unique (company_id, name)
);

create index if not exists idx_items_company_type on public.items(company_id, item_type);
create index if not exists idx_items_company_active on public.items(company_id, is_active);

drop trigger if exists trg_items_updated_at on public.items;
create trigger trg_items_updated_at
before update on public.items
for each row execute function set_updated_at();

-- ---------------------------------------------------------
-- Sales: Estimates, Invoices, Payments Received
-- ---------------------------------------------------------

create table if not exists public.estimates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  estimate_number text not null,
  customer_id uuid not null references public.contacts(id) on delete restrict,
  issue_date date not null default current_date,
  expiry_date date,
  status doc_status not null default 'draft',
  notes text,
  subtotal numeric(14,2) not null default 0,
  discount_total numeric(14,2) not null default 0,
  tax_total numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  currency_code char(3) not null,
  converted_invoice_id uuid,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, estimate_number)
);

create index if not exists idx_estimates_company_customer on public.estimates(company_id, customer_id);

drop trigger if exists trg_estimates_updated_at on public.estimates;
create trigger trg_estimates_updated_at
before update on public.estimates
for each row execute function set_updated_at();

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  invoice_number text not null,
  customer_id uuid not null references public.contacts(id) on delete restrict,
  estimate_id uuid references public.estimates(id) on delete set null,
  issue_date date not null default current_date,
  due_date date not null,
  status doc_status not null default 'draft',
  notes text,
  terms text,
  subtotal numeric(14,2) not null default 0,
  discount_total numeric(14,2) not null default 0,
  tax_total numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  amount_paid numeric(14,2) not null default 0,
  amount_due numeric(14,2) not null default 0,
  currency_code char(3) not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, invoice_number)
);

create index if not exists idx_invoices_company_customer_status on public.invoices(company_id, customer_id, status);
create index if not exists idx_invoices_company_due_date on public.invoices(company_id, due_date);

drop trigger if exists trg_invoices_updated_at on public.invoices;
create trigger trg_invoices_updated_at
before update on public.invoices
for each row execute function set_updated_at();

create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  item_id uuid references public.items(id) on delete restrict,
  description text not null,
  quantity numeric(14,4) not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  discount_percent numeric(7,4) not null default 0 check (discount_percent >= 0 and discount_percent <= 100),
  tax_rate_id uuid references public.tax_rates(id) on delete set null,
  line_subtotal numeric(14,2) not null default 0,
  line_tax numeric(14,2) not null default 0,
  line_total numeric(14,2) not null default 0,
  line_no int not null default 1,
  created_at timestamptz not null default now(),
  unique (invoice_id, line_no)
);

create index if not exists idx_invoice_line_items_invoice on public.invoice_line_items(invoice_id);

create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  payment_date date not null default current_date,
  amount numeric(14,2) not null check (amount > 0),
  payment_method text,
  reference_no text,
  notes text,
  deposited_to_account_id uuid not null references public.accounts(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists idx_invoice_payments_invoice_date on public.invoice_payments(invoice_id, payment_date desc);

-- ---------------------------------------------------------
-- Purchases: Bills, Expenses, Payments Made
-- ---------------------------------------------------------

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  bill_number text not null,
  vendor_id uuid not null references public.contacts(id) on delete restrict,
  bill_date date not null default current_date,
  due_date date not null,
  status doc_status not null default 'draft',
  notes text,
  subtotal numeric(14,2) not null default 0,
  tax_total numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  amount_paid numeric(14,2) not null default 0,
  amount_due numeric(14,2) not null default 0,
  currency_code char(3) not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, bill_number)
);

create index if not exists idx_bills_company_vendor_status on public.bills(company_id, vendor_id, status);

drop trigger if exists trg_bills_updated_at on public.bills;
create trigger trg_bills_updated_at
before update on public.bills
for each row execute function set_updated_at();

create table if not exists public.bill_line_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  bill_id uuid not null references public.bills(id) on delete cascade,
  item_id uuid references public.items(id) on delete restrict,
  expense_account_id uuid references public.accounts(id) on delete restrict,
  description text not null,
  quantity numeric(14,4) not null default 1 check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  tax_rate_id uuid references public.tax_rates(id) on delete set null,
  line_subtotal numeric(14,2) not null default 0,
  line_tax numeric(14,2) not null default 0,
  line_total numeric(14,2) not null default 0,
  line_no int not null default 1,
  created_at timestamptz not null default now(),
  unique (bill_id, line_no)
);

create index if not exists idx_bill_line_items_bill on public.bill_line_items(bill_id);

create table if not exists public.bill_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  bill_id uuid not null references public.bills(id) on delete restrict,
  payment_date date not null default current_date,
  amount numeric(14,2) not null check (amount > 0),
  payment_method text,
  reference_no text,
  notes text,
  paid_from_account_id uuid not null references public.accounts(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists idx_bill_payments_bill_date on public.bill_payments(bill_id, payment_date desc);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vendor_id uuid references public.contacts(id) on delete set null,
  expense_date date not null default current_date,
  description text not null,
  amount numeric(14,2) not null check (amount > 0),
  tax_rate_id uuid references public.tax_rates(id) on delete set null,
  tax_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  payment_account_id uuid not null references public.accounts(id) on delete restrict,
  expense_account_id uuid not null references public.accounts(id) on delete restrict,
  receipt_path text, -- Supabase Storage object path (e.g., receipts/company_id/file.jpg)
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_expenses_company_date on public.expenses(company_id, expense_date desc);
create index if not exists idx_expenses_company_vendor on public.expenses(company_id, vendor_id);

drop trigger if exists trg_expenses_updated_at on public.expenses;
create trigger trg_expenses_updated_at
before update on public.expenses
for each row execute function set_updated_at();

-- ---------------------------------------------------------
-- Manual Journals
-- ---------------------------------------------------------

create table if not exists public.manual_journals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  journal_date date not null default current_date,
  reference_no text,
  memo text,
  journal_entry_id uuid unique references public.journal_entries(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists idx_manual_journals_company_date on public.manual_journals(company_id, journal_date desc);

-- ---------------------------------------------------------
-- Referential additions
-- ---------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'fk_gl_contact'
      and conrelid = 'public.general_ledger'::regclass
  ) then
    alter table public.general_ledger
      add constraint fk_gl_contact
      foreign key (contact_id) references public.contacts(id) on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'fk_estimates_converted_invoice'
      and conrelid = 'public.estimates'::regclass
  ) then
    alter table public.estimates
      add constraint fk_estimates_converted_invoice
      foreign key (converted_invoice_id) references public.invoices(id) on delete set null;
  end if;
end $$;

-- ---------------------------------------------------------
-- Company membership helper functions for RLS
-- ---------------------------------------------------------

create or replace function public.is_company_member(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members cm
    where cm.company_id = p_company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
  );
$$;

create or replace function public.has_company_role(p_company_id uuid, p_roles member_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members cm
    where cm.company_id = p_company_id
      and cm.user_id = auth.uid()
      and cm.is_active = true
      and cm.role = any(p_roles)
  );
$$;

-- ---------------------------------------------------------
-- RLS Enable
-- ---------------------------------------------------------
alter table public.user_profiles enable row level security;
alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.tax_rates enable row level security;
alter table public.accounts enable row level security;
alter table public.journal_entries enable row level security;
alter table public.general_ledger enable row level security;
alter table public.contacts enable row level security;
alter table public.items enable row level security;
alter table public.estimates enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_line_items enable row level security;
alter table public.invoice_payments enable row level security;
alter table public.bills enable row level security;
alter table public.bill_line_items enable row level security;
alter table public.bill_payments enable row level security;
alter table public.expenses enable row level security;
alter table public.manual_journals enable row level security;

-- ---------------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------------

-- user_profiles
create policy "user_profiles_select_own"
on public.user_profiles for select
using (id = auth.uid());

create policy "user_profiles_update_own"
on public.user_profiles for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "user_profiles_insert_own"
on public.user_profiles for insert
with check (id = auth.uid());

-- companies
create policy "companies_select_member"
on public.companies for select
using (public.is_company_member(id));

create policy "companies_insert_authenticated"
on public.companies for insert
with check (created_by = auth.uid());

create policy "companies_update_admin"
on public.companies for update
using (public.has_company_role(id, array['owner'::member_role,'admin'::member_role]))
with check (public.has_company_role(id, array['owner'::member_role,'admin'::member_role]));

-- company_members
create policy "company_members_select_member"
on public.company_members for select
using (public.is_company_member(company_id));

create policy "company_members_insert_admin"
on public.company_members for insert
with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role]));

create policy "company_members_update_admin"
on public.company_members for update
using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role]))
with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role]));

create policy "company_members_delete_owner_admin"
on public.company_members for delete
using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role]));

-- Generic company-scoped table helper pattern replicated per table
-- tax_rates
create policy "tax_rates_select_member" on public.tax_rates for select using (public.is_company_member(company_id));
create policy "tax_rates_insert_bookkeeper" on public.tax_rates for insert with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role]));
create policy "tax_rates_update_bookkeeper" on public.tax_rates for update using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role])) with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role]));
create policy "tax_rates_delete_admin" on public.tax_rates for delete using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role]));

-- accounts
create policy "accounts_select_member" on public.accounts for select using (public.is_company_member(company_id));
create policy "accounts_insert_bookkeeper" on public.accounts for insert with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role]));
create policy "accounts_update_bookkeeper" on public.accounts for update using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role])) with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role]));
create policy "accounts_delete_admin" on public.accounts for delete using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role]));

-- journal_entries
create policy "journal_entries_select_member" on public.journal_entries for select using (public.is_company_member(company_id));
create policy "journal_entries_insert_bookkeeper" on public.journal_entries for insert with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role]) and posted_by = auth.uid());
create policy "journal_entries_update_bookkeeper" on public.journal_entries for update using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role])) with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role]));
create policy "journal_entries_delete_admin" on public.journal_entries for delete using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role]));

-- general_ledger
create policy "general_ledger_select_member" on public.general_ledger for select using (public.is_company_member(company_id));
create policy "general_ledger_insert_bookkeeper" on public.general_ledger for insert with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role]));
create policy "general_ledger_update_bookkeeper" on public.general_ledger for update using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role])) with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role]));
create policy "general_ledger_delete_admin" on public.general_ledger for delete using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role]));

-- contacts
create policy "contacts_select_member" on public.contacts for select using (public.is_company_member(company_id));
create policy "contacts_insert_staff" on public.contacts for insert with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role,'staff'::member_role]));
create policy "contacts_update_staff" on public.contacts for update using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role,'staff'::member_role])) with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role,'staff'::member_role]));
create policy "contacts_delete_admin" on public.contacts for delete using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role]));

-- items
create policy "items_select_member" on public.items for select using (public.is_company_member(company_id));
create policy "items_insert_staff" on public.items for insert with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role,'staff'::member_role]));
create policy "items_update_staff" on public.items for update using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role,'staff'::member_role])) with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role,'staff'::member_role]));
create policy "items_delete_admin" on public.items for delete using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role]));

-- estimates
create policy "estimates_select_member" on public.estimates for select using (public.is_company_member(company_id));
create policy "estimates_insert_staff" on public.estimates for insert with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role,'staff'::member_role]) and created_by = auth.uid());
create policy "estimates_update_staff" on public.estimates for update using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role,'staff'::member_role])) with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role,'staff'::member_role]));
create policy "estimates_delete_admin" on public.estimates for delete using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role]));

-- invoices
create policy "invoices_select_member" on public.invoices for select using (public.is_company_member(company_id));
create policy "invoices_insert_staff" on public.invoices for insert with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role,'staff'::member_role]) and created_by = auth.uid());
create policy "invoices_update_staff" on public.invoices for update using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role,'staff'::member_role])) with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role,'staff'::member_role]));
create policy "invoices_delete_admin" on public.invoices for delete using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role]));

-- invoice_line_items
create policy "invoice_line_items_select_member" on public.invoice_line_items for select using (public.is_company_member(company_id));
create policy "invoice_line_items_insert_staff" on public.invoice_line_items for insert with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role,'staff'::member_role]));
create policy "invoice_line_items_update_staff" on public.invoice_line_items for update using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role,'staff'::member_role])) with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role,'staff'::member_role]));
create policy "invoice_line_items_delete_admin" on public.invoice_line_items for delete using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role]));

-- invoice_payments
create policy "invoice_payments_select_member" on public.invoice_payments for select using (public.is_company_member(company_id));
create policy "invoice_payments_insert_staff" on public.invoice_payments for insert with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role,'staff'::member_role]) and created_by = auth.uid());
create policy "invoice_payments_update_bookkeeper" on public.invoice_payments for update using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role])) with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role]));
create policy "invoice_payments_delete_admin" on public.invoice_payments for delete using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role]));

-- bills
create policy "bills_select_member" on public.bills for select using (public.is_company_member(company_id));
create policy "bills_insert_staff" on public.bills for insert with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role,'staff'::member_role]) and created_by = auth.uid());
create policy "bills_update_staff" on public.bills for update using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role,'staff'::member_role])) with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role,'staff'::member_role]));
create policy "bills_delete_admin" on public.bills for delete using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role]));

-- bill_line_items
create policy "bill_line_items_select_member" on public.bill_line_items for select using (public.is_company_member(company_id));
create policy "bill_line_items_insert_staff" on public.bill_line_items for insert with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role,'staff'::member_role]));
create policy "bill_line_items_update_staff" on public.bill_line_items for update using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role,'staff'::member_role])) with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role,'staff'::member_role]));
create policy "bill_line_items_delete_admin" on public.bill_line_items for delete using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role]));

-- bill_payments
create policy "bill_payments_select_member" on public.bill_payments for select using (public.is_company_member(company_id));
create policy "bill_payments_insert_staff" on public.bill_payments for insert with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role,'staff'::member_role]) and created_by = auth.uid());
create policy "bill_payments_update_bookkeeper" on public.bill_payments for update using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role])) with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role]));
create policy "bill_payments_delete_admin" on public.bill_payments for delete using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role]));

-- expenses
create policy "expenses_select_member" on public.expenses for select using (public.is_company_member(company_id));
create policy "expenses_insert_staff" on public.expenses for insert with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role,'staff'::member_role]) and created_by = auth.uid());
create policy "expenses_update_staff" on public.expenses for update using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role,'staff'::member_role])) with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role,'staff'::member_role]));
create policy "expenses_delete_admin" on public.expenses for delete using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role]));

-- manual_journals
create policy "manual_journals_select_member" on public.manual_journals for select using (public.is_company_member(company_id));
create policy "manual_journals_insert_bookkeeper" on public.manual_journals for insert with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role]) and created_by = auth.uid());
create policy "manual_journals_update_bookkeeper" on public.manual_journals for update using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role])) with check (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role,'bookkeeper'::member_role]));
create policy "manual_journals_delete_admin" on public.manual_journals for delete using (public.has_company_role(company_id, array['owner'::member_role,'admin'::member_role]));

-- ---------------------------------------------------------
-- Storage policy note (receipts bucket)
-- ---------------------------------------------------------
-- Create a private bucket named: receipts
-- Recommended object path convention: {company_id}/{expense_id}/{filename}
-- Add storage RLS policies in Supabase for bucket_id = 'receipts'
-- using company membership derived from the first path segment.