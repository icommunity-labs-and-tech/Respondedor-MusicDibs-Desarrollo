// ============================================
// Convenience type aliases from auto-generated Supabase types
// ============================================

import type { Tables, TablesInsert, TablesUpdate } from "./supabase";

// Row types (for reading from DB)
export type Project = Tables<"projects">;
export type Email = Tables<"emails">;
export type Draft = Tables<"drafts">;
export type EmailAccount = Tables<"email_accounts">;

// Insert types (for creating new records)
export type ProjectInsert = TablesInsert<"projects">;
export type EmailInsert = TablesInsert<"emails">;
export type DraftInsert = TablesInsert<"drafts">;

// Update types (for updating existing records)
export type ProjectUpdate = TablesUpdate<"projects">;
export type EmailUpdate = TablesUpdate<"emails">;
export type DraftUpdate = TablesUpdate<"drafts">;

// Email with its draft (joined query)
export type EmailWithDraft = Email & {
  drafts: Draft | null;
};

// Status type literals
export type EmailStatus = "pending" | "draft_ready" | "sent" | "archived";
export type ProjectStatus = "active" | "inactive";
