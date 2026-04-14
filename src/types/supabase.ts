export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      drafts: {
        Row: {
          ai_response: string
          created_at: string
          edited_response: string
          email_id: string
          id: string
          model_used: string
          project_id: string
          sent_at: string | null
          tokens_used: number | null
          updated_at: string
        }
        Insert: {
          ai_response: string
          created_at?: string
          edited_response: string
          email_id: string
          id?: string
          model_used?: string
          project_id: string
          sent_at?: string | null
          tokens_used?: number | null
          updated_at?: string
        }
        Update: {
          ai_response?: string
          created_at?: string
          edited_response?: string
          email_id?: string
          id?: string
          model_used?: string
          project_id?: string
          sent_at?: string | null
          tokens_used?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drafts_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: true
            referencedRelation: "emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drafts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      email_accounts: {
        Row: {
          created_at: string
          email_user: string
          id: string
          imap_host: string
          imap_port: number
          project_id: string
          smtp_host: string
          smtp_port: number
          tls_enabled: boolean
        }
        Insert: {
          created_at?: string
          email_user: string
          id?: string
          imap_host: string
          imap_port?: number
          project_id: string
          smtp_host: string
          smtp_port?: number
          tls_enabled?: boolean
        }
        Update: {
          created_at?: string
          email_user?: string
          id?: string
          imap_host?: string
          imap_port?: number
          project_id?: string
          smtp_host?: string
          smtp_port?: number
          tls_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "email_accounts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      emails: {
        Row: {
          body_html: string | null
          body_text: string | null
          created_at: string
          from_address: string
          from_name: string | null
          id: string
          in_reply_to: string | null
          is_favorite: boolean
          message_id: string
          project_id: string
          received_at: string
          status: string
          subject: string
          to_address: string
          uid: number | null
          updated_at: string
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          from_address: string
          from_name?: string | null
          id?: string
          in_reply_to?: string | null
          is_favorite?: boolean
          message_id: string
          project_id: string
          received_at?: string
          status?: string
          subject?: string
          to_address: string
          uid?: number | null
          updated_at?: string
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          from_address?: string
          from_name?: string | null
          id?: string
          in_reply_to?: string | null
          is_favorite?: boolean
          message_id?: string
          project_id?: string
          received_at?: string
          status?: string
          subject?: string
          to_address?: string
          uid?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emails_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          context_file: string
          created_at: string
          email_address: string
          id: string
          logo_bg_color: string
          logo_letter: string
          name: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          context_file: string
          created_at?: string
          email_address: string
          id?: string
          logo_bg_color?: string
          logo_letter?: string
          name: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          context_file?: string
          created_at?: string
          email_address?: string
          id?: string
          logo_bg_color?: string
          logo_letter?: string
          name?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
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
