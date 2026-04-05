create or replace function public.resolve_company_account_id(
  p_company_id uuid,
  p_candidate_codes text[] default null,
  p_candidate_names text[] default null,
  p_fallback_category account_category default null
)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_account_id uuid;
begin
  select a.id
  into v_account_id
  from public.accounts a
  where a.company_id = p_company_id
    and a.is_active = true
    and (
      (p_candidate_codes is not null and a.code = any(p_candidate_codes))
      or (p_candidate_names is not null and lower(a.name) = any(p_candidate_names))
    )
  order by
    case when p_candidate_codes is not null and a.code = any(p_candidate_codes) then 0 else 1 end,
    case when p_candidate_names is not null and lower(a.name) = any(p_candidate_names) then 0 else 1 end,
    a.created_at asc
  limit 1;

  if v_account_id is not null then
    return v_account_id;
  end if;

  if p_fallback_category is not null then
    select a.id
    into v_account_id
    from public.accounts a
    where a.company_id = p_company_id
      and a.is_active = true
      and a.category = p_fallback_category
    order by a.is_system desc, a.created_at asc
    limit 1;
  end if;

  return v_account_id;
end;
$$;

create or replace function public.create_sales_invoice(
  p_company_id uuid,
  p_created_by uuid,
  p_customer_id uuid,
  p_issue_date date,
  p_due_date date,
  p_status doc_status,
  p_currency_code char(3),
  p_invoice_number text,
  p_notes text default null,
  p_terms text default null,
  p_lines jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id uuid;
  v_journal_entry_id uuid;
  v_receivables_account_id uuid;
  v_revenue_account_id uuid;
  v_tax_account_id uuid;
  v_subtotal numeric(14,2) := 0;
  v_tax_total numeric(14,2) := 0;
  v_total numeric(14,2) := 0;
begin
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'At least one invoice line item is required';
  end if;

  with parsed_lines as (
    select
      row_number() over () as line_no,
      nullif(trim(line_item->>'item_id'), '')::uuid as item_id,
      nullif(trim(line_item->>'description'), '') as description,
      ((line_item->>'quantity')::numeric(14,4)) as quantity,
      ((line_item->>'unit_price')::numeric(14,2)) as unit_price
    from jsonb_array_elements(p_lines) as line_item
  )
  select
    coalesce(sum(round(quantity * unit_price, 2)), 0)::numeric(14,2),
    0::numeric(14,2),
    coalesce(sum(round(quantity * unit_price, 2)), 0)::numeric(14,2)
  into v_subtotal, v_tax_total, v_total
  from parsed_lines;

  if v_total <= 0 then
    raise exception 'Invoice total must be greater than zero';
  end if;

  insert into public.invoices (
    company_id,
    invoice_number,
    customer_id,
    issue_date,
    due_date,
    status,
    notes,
    terms,
    subtotal,
    discount_total,
    tax_total,
    total,
    amount_paid,
    amount_due,
    currency_code,
    created_by
  ) values (
    p_company_id,
    p_invoice_number,
    p_customer_id,
    p_issue_date,
    p_due_date,
    p_status,
    p_notes,
    p_terms,
    v_subtotal,
    0,
    v_tax_total,
    v_total,
    0,
    v_total,
    p_currency_code,
    p_created_by
  )
  returning id into v_invoice_id;

  with parsed_lines as (
    select
      row_number() over () as line_no,
      nullif(trim(line_item->>'item_id'), '')::uuid as item_id,
      coalesce(nullif(trim(line_item->>'description'), ''), '') as description,
      ((line_item->>'quantity')::numeric(14,4)) as quantity,
      ((line_item->>'unit_price')::numeric(14,2)) as unit_price
    from jsonb_array_elements(p_lines) as line_item
  )
  insert into public.invoice_line_items (
    company_id,
    invoice_id,
    item_id,
    description,
    quantity,
    unit_price,
    discount_percent,
    tax_rate_id,
    line_subtotal,
    line_tax,
    line_total,
    line_no
  )
  select
    p_company_id,
    v_invoice_id,
    item_id,
    description,
    quantity,
    unit_price,
    0,
    null,
    round(quantity * unit_price, 2),
    0,
    round(quantity * unit_price, 2),
    line_no
  from parsed_lines;

  if p_status = 'sent' then
    v_receivables_account_id := public.resolve_company_account_id(
      p_company_id,
      array['1100', '1200', '1300'],
      array['accounts receivable', 'trade receivables', 'receivables', 'accounts receivable - trade'],
      'asset'
    );
    v_revenue_account_id := public.resolve_company_account_id(
      p_company_id,
      array['4000', '4010', '4100'],
      array['sales revenue', 'revenue', 'service revenue', 'income from sales'],
      'income'
    );

    if v_receivables_account_id is null then
      raise exception 'Accounts receivable account is not configured for this company';
    end if;

    if v_revenue_account_id is null then
      raise exception 'Sales revenue account is not configured for this company';
    end if;

    if v_tax_total > 0 then
      v_tax_account_id := public.resolve_company_account_id(
        p_company_id,
        array['2100', '2200', '2300'],
        array['tax payable', 'sales tax payable', 'vat payable', 'gst payable'],
        'liability'
      );

      if v_tax_account_id is null then
        raise exception 'Tax liability account is not configured for this company';
      end if;
    end if;

    insert into public.journal_entries (
      company_id,
      entry_date,
      source_type,
      source_id,
      memo,
      posted_by
    ) values (
      p_company_id,
      p_issue_date,
      'invoice',
      v_invoice_id,
      p_invoice_number,
      p_created_by
    )
    returning id into v_journal_entry_id;

    insert into public.general_ledger (
      company_id,
      journal_entry_id,
      account_id,
      description,
      debit,
      credit,
      line_no
    ) values (
      p_company_id,
      v_journal_entry_id,
      v_receivables_account_id,
      p_invoice_number,
      v_total,
      0,
      1
    );

    insert into public.general_ledger (
      company_id,
      journal_entry_id,
      account_id,
      description,
      debit,
      credit,
      line_no
    ) values (
      p_company_id,
      v_journal_entry_id,
      v_revenue_account_id,
      p_invoice_number,
      0,
      v_subtotal,
      2
    );

    if v_tax_total > 0 then
      insert into public.general_ledger (
        company_id,
        journal_entry_id,
        account_id,
        description,
        debit,
        credit,
        line_no
      ) values (
        p_company_id,
        v_journal_entry_id,
        v_tax_account_id,
        p_invoice_number,
        0,
        v_tax_total,
        3
      );
    end if;
  end if;

  return jsonb_build_object(
    'invoice_id', v_invoice_id,
    'invoice_number', p_invoice_number,
    'journal_entry_id', v_journal_entry_id,
    'status', p_status,
    'total', v_total,
    'amount_due', v_total,
    'amount_paid', 0
  );
end;
$$;

create or replace function public.record_sales_invoice_payment(
  p_company_id uuid,
  p_invoice_id uuid,
  p_created_by uuid,
  p_payment_date date,
  p_amount numeric(14,2),
  p_deposited_to_account_id uuid,
  p_payment_method text default null,
  p_reference_no text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice record;
  v_payment_id uuid;
  v_journal_entry_id uuid;
  v_receivables_account_id uuid;
  v_next_paid numeric(14,2);
  v_next_due numeric(14,2);
  v_next_status doc_status;
begin
  select id, invoice_number, total, amount_paid, amount_due, status
  into v_invoice
  from public.invoices
  where company_id = p_company_id
    and id = p_invoice_id;

  if not found then
    raise exception 'Invoice not found';
  end if;

  if v_invoice.status in ('void', 'cancelled') then
    raise exception 'Cannot record payment for void or cancelled invoice';
  end if;

  if p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  if p_amount > v_invoice.amount_due then
    raise exception 'Payment amount exceeds invoice due amount';
  end if;

  insert into public.invoice_payments (
    company_id,
    invoice_id,
    payment_date,
    amount,
    payment_method,
    reference_no,
    notes,
    deposited_to_account_id,
    created_by
  ) values (
    p_company_id,
    p_invoice_id,
    p_payment_date,
    p_amount,
    p_payment_method,
    p_reference_no,
    p_notes,
    p_deposited_to_account_id,
    p_created_by
  )
  returning id into v_payment_id;

  v_next_paid := round(v_invoice.amount_paid + p_amount, 2);
  v_next_due := round(greatest(v_invoice.total - v_next_paid, 0), 2);
  v_next_status := case when v_next_due = 0 then 'paid' else 'partially_paid' end;

  update public.invoices
  set amount_paid = v_next_paid,
      amount_due = v_next_due,
      status = v_next_status
  where id = p_invoice_id
    and company_id = p_company_id;

  v_receivables_account_id := public.resolve_company_account_id(
    p_company_id,
    array['1100', '1200', '1300'],
    array['accounts receivable', 'trade receivables', 'receivables', 'accounts receivable - trade'],
    'asset'
  );

  if v_receivables_account_id is null then
    raise exception 'Accounts receivable account is not configured for this company';
  end if;

  insert into public.journal_entries (
    company_id,
    entry_date,
    source_type,
    source_id,
    memo,
    posted_by
  ) values (
    p_company_id,
    p_payment_date,
    'invoice_payment',
    v_payment_id,
    coalesce(p_reference_no, v_invoice.invoice_number),
    p_created_by
  )
  returning id into v_journal_entry_id;

  insert into public.general_ledger (
    company_id,
    journal_entry_id,
    account_id,
    description,
    debit,
    credit,
    line_no
  ) values (
    p_company_id,
    v_journal_entry_id,
    p_deposited_to_account_id,
    v_invoice.invoice_number,
    p_amount,
    0,
    1
  );

  insert into public.general_ledger (
    company_id,
    journal_entry_id,
    account_id,
    description,
    debit,
    credit,
    line_no
  ) values (
    p_company_id,
    v_journal_entry_id,
    v_receivables_account_id,
    v_invoice.invoice_number,
    0,
    p_amount,
    2
  );

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'journal_entry_id', v_journal_entry_id,
    'invoice_id', p_invoice_id,
    'status', v_next_status,
    'amount_paid', v_next_paid,
    'amount_due', v_next_due
  );
end;
$$;