export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          legal_name: string;
          display_name: string;
          base_currency: string;
          fiscal_year_start_month: number;
          timezone: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          legal_name: string;
          display_name: string;
          base_currency?: string;
          fiscal_year_start_month?: number;
          timezone?: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
        Relationships: [];
      };
      company_members: {
        Row: {
          company_id: string;
          user_id: string;
          role: "owner" | "admin" | "bookkeeper" | "staff" | "viewer";
          is_active: boolean;
          joined_at: string;
        };
        Insert: {
          company_id: string;
          user_id: string;
          role?: "owner" | "admin" | "bookkeeper" | "staff" | "viewer";
          is_active?: boolean;
          joined_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["company_members"]["Insert"]>;
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          company_id: string;
          contact_type: "customer" | "vendor" | "both";
          display_name: string;
          email: string | null;
          phone: string | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          contact_type: "customer" | "vendor" | "both";
          display_name: string;
          email?: string | null;
          phone?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["contacts"]["Insert"]>;
        Relationships: [];
      };
      accounts: {
        Row: {
          id: string;
          company_id: string;
          code: string;
          name: string;
          category: "asset" | "liability" | "equity" | "income" | "expense";
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          code: string;
          name: string;
          category: "asset" | "liability" | "equity" | "income" | "expense";
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["accounts"]["Insert"]>;
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          company_id: string;
          vendor_id: string | null;
          payment_account_id: string;
          expense_account_id: string;
          description: string;
          amount: number;
          tax_amount: number;
          total_amount: number;
          expense_date: string;
          notes: string | null;
          receipt_path: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          vendor_id?: string | null;
          payment_account_id: string;
          expense_account_id: string;
          description: string;
          amount: number;
          tax_amount?: number;
          total_amount?: number;
          expense_date?: string;
          notes?: string | null;
          receipt_path?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["expenses"]["Insert"]>;
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          company_id: string;
          customer_id: string;
          invoice_number: string;
          issue_date: string;
          due_date: string;
          status: "draft" | "sent" | "partially_paid" | "paid" | "void" | "cancelled";
          subtotal: number;
          tax_total: number;
          total: number;
          amount_paid: number;
          amount_due: number;
          currency_code: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          customer_id: string;
          invoice_number: string;
          issue_date?: string;
          due_date: string;
          status?: "draft" | "sent" | "partially_paid" | "paid" | "void" | "cancelled";
          subtotal?: number;
          tax_total?: number;
          total?: number;
          amount_paid?: number;
          amount_due?: number;
          currency_code?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["invoices"]["Insert"]>;
        Relationships: [];
      };
      invoice_line_items: {
        Row: {
          id: string;
          company_id: string;
          invoice_id: string;
          item_id: string | null;
          description: string;
          quantity: number;
          unit_price: number;
          line_subtotal: number;
          line_tax: number;
          line_total: number;
          line_no: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          invoice_id: string;
          item_id?: string | null;
          description: string;
          quantity: number;
          unit_price: number;
          line_subtotal?: number;
          line_tax?: number;
          line_total?: number;
          line_no?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["invoice_line_items"]["Insert"]>;
        Relationships: [];
      };
      invoice_payments: {
        Row: {
          id: string;
          company_id: string;
          invoice_id: string;
          payment_date: string;
          amount: number;
          payment_method: string | null;
          reference_no: string | null;
          notes: string | null;
          deposited_to_account_id: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          invoice_id: string;
          payment_date?: string;
          amount: number;
          payment_method?: string | null;
          reference_no?: string | null;
          notes?: string | null;
          deposited_to_account_id: string;
          created_by: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["invoice_payments"]["Insert"]>;
        Relationships: [];
      };
      bills: {
        Row: {
          id: string;
          company_id: string;
          vendor_id: string;
          bill_number: string;
          bill_date: string;
          due_date: string;
          status: "draft" | "sent" | "partially_paid" | "paid" | "void" | "cancelled";
          notes: string | null;
          subtotal: number;
          tax_total: number;
          total: number;
          amount_paid: number;
          amount_due: number;
          currency_code: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          vendor_id: string;
          bill_number: string;
          bill_date?: string;
          due_date: string;
          status?: "draft" | "sent" | "partially_paid" | "paid" | "void" | "cancelled";
          notes?: string | null;
          subtotal?: number;
          tax_total?: number;
          total?: number;
          amount_paid?: number;
          amount_due?: number;
          currency_code?: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["bills"]["Insert"]>;
        Relationships: [];
      };
      bill_payments: {
        Row: {
          id: string;
          company_id: string;
          bill_id: string;
          payment_date: string;
          amount: number;
          payment_method: string | null;
          reference_no: string | null;
          notes: string | null;
          paid_from_account_id: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          bill_id: string;
          payment_date?: string;
          amount: number;
          payment_method?: string | null;
          reference_no?: string | null;
          notes?: string | null;
          paid_from_account_id: string;
          created_by: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["bill_payments"]["Insert"]>;
        Relationships: [];
      };
      bill_line_items: {
        Row: {
          id: string;
          company_id: string;
          bill_id: string;
          item_id: string | null;
          expense_account_id: string | null;
          description: string;
          quantity: number;
          unit_price: number;
          tax_rate_id: string | null;
          line_subtotal: number;
          line_tax: number;
          line_total: number;
          line_no: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          bill_id: string;
          item_id?: string | null;
          expense_account_id?: string | null;
          description: string;
          quantity?: number;
          unit_price: number;
          tax_rate_id?: string | null;
          line_subtotal?: number;
          line_tax?: number;
          line_total?: number;
          line_no?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["bill_line_items"]["Insert"]>;
        Relationships: [];
      };
      general_ledger: {
        Row: {
          id: string;
          company_id: string;
          journal_entry_id: string;
          account_id: string;
          contact_id: string | null;
          line_no: number;
          debit: number;
          credit: number;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          journal_entry_id: string;
          account_id: string;
          contact_id?: string | null;
          line_no?: number;
          debit?: number;
          credit?: number;
          description?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["general_ledger"]["Insert"]>;
        Relationships: [];
      };
      journal_entries: {
        Row: {
          id: string;
          company_id: string;
          entry_number: number;
          entry_date: string;
          source_type:
            | "invoice"
            | "invoice_payment"
            | "bill"
            | "bill_payment"
            | "expense"
            | "manual_journal"
            | "opening_balance"
            | "system_adjustment";
          source_id: string | null;
          memo: string | null;
          posted_at: string;
          posted_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          entry_number?: number;
          entry_date?: string;
          source_type:
            | "invoice"
            | "invoice_payment"
            | "bill"
            | "bill_payment"
            | "expense"
            | "manual_journal"
            | "opening_balance"
            | "system_adjustment";
          source_id?: string | null;
          memo?: string | null;
          posted_at?: string;
          posted_by: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["journal_entries"]["Insert"]>;
        Relationships: [];
      };
      items: {
        Row: {
          id: string;
          company_id: string;
          item_type: "goods" | "service";
          name: string;
          selling_price: number;
          cost_price: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          item_type: "goods" | "service";
          name: string;
          selling_price?: number;
          cost_price?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["items"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_sales_invoice: {
        Args: {
          p_company_id: string;
          p_created_by: string;
          p_customer_id: string;
          p_issue_date: string;
          p_due_date: string;
          p_status: Database["public"]["Enums"]["doc_status"];
          p_currency_code: string;
          p_invoice_number: string;
          p_notes?: string | null;
          p_terms?: string | null;
          p_lines?: Json;
        };
        Returns: Json;
      };
      record_sales_invoice_payment: {
        Args: {
          p_company_id: string;
          p_invoice_id: string;
          p_created_by: string;
          p_payment_date: string;
          p_amount: number;
          p_deposited_to_account_id: string;
          p_payment_method?: string | null;
          p_reference_no?: string | null;
          p_notes?: string | null;
        };
        Returns: Json;
      };
    };
    Enums: {
      account_category: "asset" | "liability" | "equity" | "income" | "expense";
      contact_type: "customer" | "vendor" | "both";
      doc_status: "draft" | "sent" | "partially_paid" | "paid" | "void" | "cancelled";
      member_role: "owner" | "admin" | "bookkeeper" | "staff" | "viewer";
      entry_source_type:
        | "invoice"
        | "invoice_payment"
        | "bill"
        | "bill_payment"
        | "expense"
        | "manual_journal"
        | "opening_balance"
        | "system_adjustment";
      item_type: "goods" | "service";
    };
    CompositeTypes: Record<string, never>;
  };
};
