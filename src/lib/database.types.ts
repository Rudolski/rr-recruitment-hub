/**
 * Handmatige weergave van het databaseschema (supabase/migrations/
 * 001_init_mvp_schema.sql). Gebruikt om de Supabase-clients te typen,
 * zodat kolomnamen tijdens het bouwen gecontroleerd worden.
 *
 * Statuskolommen zijn `text` met een CHECK-constraint (geen echte
 * Postgres enum), dus hier `string`; de app versmalt ze in
 * src/lib/types.ts.
 *
 * Later te vervangen door `npx supabase gen types typescript`.
 */

type Timestamps = { created_at: string };

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: { id: string; name: string } & Timestamps;
        Insert: { id?: string; name: string; created_at?: string };
        Update: { id?: string; name?: string; created_at?: string };
        Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: string;
        } & Timestamps;
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          kvk_number: string | null;
          sector: string | null;
          region: string | null;
          status: string;
          account_owner_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          kvk_number?: string | null;
          sector?: string | null;
          region?: string | null;
          status?: string;
          account_owner_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          kvk_number?: string | null;
          sector?: string | null;
          region?: string | null;
          status?: string;
          account_owner_id?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          organization_id: string;
          client_id: string;
          name: string;
          role: string | null;
          email: string | null;
          phone: string | null;
          is_primary: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          client_id: string;
          name: string;
          role?: string | null;
          email?: string | null;
          phone?: string | null;
          is_primary?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          client_id?: string;
          name?: string;
          role?: string | null;
          email?: string | null;
          phone?: string | null;
          is_primary?: boolean;
          notes?: string | null;
        };
        Relationships: [];
      };
      fee_agreements: {
        Row: {
          id: string;
          organization_id: string;
          client_id: string;
          type: string;
          percentage: number | null;
          fixed_amount: number | null;
          minimum_fee: number | null;
          valid_from: string | null;
          valid_until: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          client_id: string;
          type: string;
          percentage?: number | null;
          fixed_amount?: number | null;
          minimum_fee?: number | null;
          valid_from?: string | null;
          valid_until?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          client_id?: string;
          type?: string;
          percentage?: number | null;
          fixed_amount?: number | null;
          minimum_fee?: number | null;
          valid_from?: string | null;
          valid_until?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      vacancies: {
        Row: {
          id: string;
          organization_id: string;
          client_id: string;
          title: string;
          function_group: string | null;
          location: string | null;
          salary_min: number | null;
          salary_max: number | null;
          employment_type: string | null;
          status: string;
          fee_agreement_id: string | null;
          expected_fee: number | null;
          expected_close_month: string | null;
          success_probability: number | null;
          consultant: string | null;
          partner_pct: number | null;
          fee_pct: number | null;
          exclusivity_until: string | null;
          description: string | null;
          requirements: string | null;
          opened_at: string;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          client_id: string;
          title: string;
          function_group?: string | null;
          location?: string | null;
          salary_min?: number | null;
          salary_max?: number | null;
          employment_type?: string | null;
          status?: string;
          fee_agreement_id?: string | null;
          expected_fee?: number | null;
          expected_close_month?: string | null;
          success_probability?: number | null;
          consultant?: string | null;
          partner_pct?: number | null;
          fee_pct?: number | null;
          exclusivity_until?: string | null;
          description?: string | null;
          requirements?: string | null;
          opened_at?: string;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          client_id?: string;
          title?: string;
          function_group?: string | null;
          location?: string | null;
          salary_min?: number | null;
          salary_max?: number | null;
          employment_type?: string | null;
          status?: string;
          fee_agreement_id?: string | null;
          expected_fee?: number | null;
          expected_close_month?: string | null;
          success_probability?: number | null;
          consultant?: string | null;
          partner_pct?: number | null;
          fee_pct?: number | null;
          exclusivity_until?: string | null;
          description?: string | null;
          requirements?: string | null;
          opened_at?: string;
          closed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      placements: {
        Row: {
          id: string;
          organization_id: string;
          client_id: string;
          candidate_name: string | null;
          partner_name: string | null;
          partner_share_amount: number | null;
          vacancy_id: string;
          start_date: string | null;
          gross_annual_salary: number | null;
          fee_amount: number | null;
          fee_percentage: number | null;
          guarantee_months: number | null;
          guarantee_end_date: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          client_id: string;
          candidate_name?: string | null;
          partner_name?: string | null;
          partner_share_amount?: number | null;
          vacancy_id: string;
          start_date?: string | null;
          gross_annual_salary?: number | null;
          fee_amount?: number | null;
          fee_percentage?: number | null;
          guarantee_months?: number | null;
          guarantee_end_date?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          client_id?: string;
          candidate_name?: string | null;
          partner_name?: string | null;
          partner_share_amount?: number | null;
          vacancy_id?: string;
          start_date?: string | null;
          gross_annual_salary?: number | null;
          fee_amount?: number | null;
          fee_percentage?: number | null;
          guarantee_months?: number | null;
          guarantee_end_date?: string | null;
          status?: string;
        };
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          organization_id: string;
          client_id: string;
          placement_id: string | null;
          invoice_number: string | null;
          entity_name: string | null;
          amount_excl_btw: number;
          btw_percentage: number;
          amount_incl_btw: number;
          status: string;
          partner_name: string | null;
          partner_share_amount: number | null;
          sent_at: string | null;
          issue_date: string | null;
          due_date: string | null;
          paid_date: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          client_id: string;
          placement_id?: string | null;
          invoice_number?: string | null;
          entity_name?: string | null;
          amount_excl_btw: number;
          btw_percentage?: number;
          status?: string;
          partner_name?: string | null;
          partner_share_amount?: number | null;
          sent_at?: string | null;
          issue_date?: string | null;
          due_date?: string | null;
          paid_date?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          client_id?: string;
          placement_id?: string | null;
          invoice_number?: string | null;
          entity_name?: string | null;
          amount_excl_btw?: number;
          btw_percentage?: number;
          status?: string;
          partner_name?: string | null;
          partner_share_amount?: number | null;
          sent_at?: string | null;
          issue_date?: string | null;
          due_date?: string | null;
          paid_date?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      client_notes: {
        Row: {
          id: string;
          organization_id: string;
          client_id: string;
          author_id: string | null;
          body: string;
          follow_up_on: string | null;
          follow_up_done: boolean;
          follow_up_done_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          client_id: string;
          author_id?: string | null;
          body: string;
          follow_up_on?: string | null;
          follow_up_done?: boolean;
          follow_up_done_at?: string | null;
          created_at?: string;
        };
        Update: {
          body?: string;
          follow_up_on?: string | null;
          follow_up_done?: boolean;
          follow_up_done_at?: string | null;
        };
        Relationships: [];
      };
      stored_files: {
        Row: {
          id: string;
          organization_id: string;
          uploaded_by: string | null;
          scope: string;
          client_id: string | null;
          storage_path: string;
          filename: string;
          mime_type: string | null;
          size_bytes: number | null;
          label: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          uploaded_by?: string | null;
          scope: string;
          client_id?: string | null;
          storage_path: string;
          filename: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          label?: string | null;
          created_at?: string;
        };
        Update: {
          label?: string | null;
        };
        Relationships: [];
      };
      generated_documents: {
        Row: {
          id: string;
          organization_id: string;
          created_by: string | null;
          type: string;
          title: string | null;
          related_entity_type: string | null;
          related_entity_id: string | null;
          input: Record<string, unknown> | null;
          content: string;
          model: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          created_by?: string | null;
          type: string;
          title?: string | null;
          related_entity_type?: string | null;
          related_entity_id?: string | null;
          input?: Record<string, unknown> | null;
          content: string;
          model?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string | null;
          content?: string;
        };
        Relationships: [];
      };
      monthly_targets: {
        Row: {
          id: string;
          organization_id: string;
          year: number;
          month: number;
          target_revenue: number | null;
          target_placements: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          year: number;
          month: number;
          target_revenue?: number | null;
          target_placements?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          year?: number;
          month?: number;
          target_revenue?: number | null;
          target_placements?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_org_member: {
        Args: { check_org_id: string };
        Returns: boolean;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
