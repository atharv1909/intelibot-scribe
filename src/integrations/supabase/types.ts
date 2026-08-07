export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      artifacts: {
        Row: {
          content: string
          created_at: string
          id: string
          kind: string
          meta: Json
          project_id: string
          review_notes: string | null
          status: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          kind: string
          meta?: Json
          project_id: string
          review_notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          kind?: string
          meta?: Json
          project_id?: string
          review_notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "artifacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          actor: string
          created_at: string
          detail: Json
          event: string
          id: string
          project_id: string
          severity: string
          stage: number | null
          user_id: string
        }
        Insert: {
          actor?: string
          created_at?: string
          detail?: Json
          event: string
          id?: string
          project_id: string
          severity?: string
          stage?: number | null
          user_id: string
        }
        Update: {
          actor?: string
          created_at?: string
          detail?: Json
          event?: string
          id?: string
          project_id?: string
          severity?: string
          stage?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      experiment_versions: {
        Row: {
          architecture_change: boolean
          config: Json
          created_at: string
          id: string
          label: string | null
          logs: string | null
          metrics: Json
          parent_version: number | null
          project_id: string
          rollback_reason: string | null
          rolled_back: boolean
          score: number | null
          user_id: string
          verdict: string
          version: number
        }
        Insert: {
          architecture_change?: boolean
          config?: Json
          created_at?: string
          id?: string
          label?: string | null
          logs?: string | null
          metrics?: Json
          parent_version?: number | null
          project_id: string
          rollback_reason?: string | null
          rolled_back?: boolean
          score?: number | null
          user_id: string
          verdict?: string
          version?: number
        }
        Update: {
          architecture_change?: boolean
          config?: Json
          created_at?: string
          id?: string
          label?: string | null
          logs?: string | null
          metrics?: Json
          parent_version?: number | null
          project_id?: string
          rollback_reason?: string | null
          rolled_back?: boolean
          score?: number | null
          user_id?: string
          verdict?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "experiment_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          created_at: string
          feasibility: string | null
          id: string
          kind: string
          project_id: string
          rationale: string | null
          requires_lab: boolean
          selected: boolean
          source_ids: Json
          summary: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feasibility?: string | null
          id?: string
          kind?: string
          project_id: string
          rationale?: string | null
          requires_lab?: boolean
          selected?: boolean
          source_ids?: Json
          summary?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          feasibility?: string | null
          id?: string
          kind?: string
          project_id?: string
          rationale?: string | null
          requires_lab?: boolean
          selected?: boolean
          source_ids?: Json
          summary?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideas_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_entries: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          lesson: string | null
          project_id: string | null
          summary: string
          title: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          lesson?: string | null
          project_id?: string | null
          summary: string
          title: string
          user_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          lesson?: string | null
          project_id?: string | null
          summary?: string
          title?: string
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "memory_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      passages: {
        Row: {
          content: string
          created_at: string
          id: string
          locator: string | null
          project_id: string
          source_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          locator?: string | null
          project_id: string
          source_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          locator?: string | null
          project_id?: string
          source_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "passages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "passages_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          branch: string
          created_at: string
          id: string
          latex_template: string
          methodology_style: string
          mode: string
          prompt: string
          stage: number
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          branch?: string
          created_at?: string
          id?: string
          latex_template?: string
          methodology_style?: string
          mode?: string
          prompt: string
          stage?: number
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          branch?: string
          created_at?: string
          id?: string
          latex_template?: string
          methodology_style?: string
          mode?: string
          prompt?: string
          stage?: number
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sources: {
        Row: {
          abstract: string | null
          authors: string | null
          created_at: string
          doi: string | null
          id: string
          injection_detail: string | null
          injection_flag: boolean
          project_id: string
          relevance: number | null
          retrieval_method: string
          retrieved_at: string
          title: string
          trust: string
          url: string | null
          user_id: string
          venue: string | null
          year: number | null
        }
        Insert: {
          abstract?: string | null
          authors?: string | null
          created_at?: string
          doi?: string | null
          id?: string
          injection_detail?: string | null
          injection_flag?: boolean
          project_id: string
          relevance?: number | null
          retrieval_method?: string
          retrieved_at?: string
          title: string
          trust?: string
          url?: string | null
          user_id: string
          venue?: string | null
          year?: number | null
        }
        Update: {
          abstract?: string | null
          authors?: string | null
          created_at?: string
          doi?: string | null
          id?: string
          injection_detail?: string | null
          injection_flag?: boolean
          project_id?: string
          relevance?: number | null
          retrieval_method?: string
          retrieved_at?: string
          title?: string
          trust?: string
          url?: string | null
          user_id?: string
          venue?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
