"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProject } from "@/contexts/project-context";
import EmailList from "@/components/email/email-list";
import EmailDetail from "@/components/email/email-detail";
import EmailEmptyState from "@/components/email/email-empty-state";
import type { EmailWithDraft } from "@/types/database";

export default function InboxPage() {
  const { activeProject } = useProject();
  const [emails, setEmails] = useState<EmailWithDraft[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailWithDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const loadEmails = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("emails")
      .select("*, drafts(*)")
      .eq("project_id", activeProject.id)
      .in("status", ["pending", "draft_ready"])
      .order("received_at", { ascending: false });

    if (data) {
      // Normalize: Supabase returns drafts as array, we want single object
      const normalized = data.map((email: Record<string, unknown>) => ({
        ...email,
        drafts: Array.isArray(email.drafts) && email.drafts.length > 0
          ? email.drafts[0]
          : null,
      })) as EmailWithDraft[];
      setEmails(normalized);

      // Update selected email if it's in the new list
      if (selectedEmail) {
        const updated = normalized.find((e) => e.id === selectedEmail.id);
        if (updated) {
          setSelectedEmail(updated);
        } else {
          setSelectedEmail(null);
        }
      }
    }
    setLoading(false);
  }, [activeProject, supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load emails when project changes
  useEffect(() => {
    loadEmails();
  }, [activeProject?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time subscription for new emails
  useEffect(() => {
    if (!activeProject) return;

    const channel = supabase
      .channel("inbox-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emails",
          filter: `project_id=eq.${activeProject.id}`,
        },
        () => {
          loadEmails();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "drafts",
          filter: `project_id=eq.${activeProject.id}`,
        },
        () => {
          loadEmails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeProject?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSendSuccess() {
    setSelectedEmail(null);
    loadEmails();
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Email list panel */}
      <div className="w-[380px] shrink-0 bg-surface-container-low/50 flex flex-col border-r border-outline-variant/10">
        {/* List header */}
        <div className="p-4 pb-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-on-surface">
              Pendientes
            </h3>
            <span className="text-xs text-on-surface-variant font-medium">
              {emails.length} {emails.length === 1 ? "email" : "emails"}
            </span>
          </div>
        </div>

        {/* Email list */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-3 text-on-surface-variant">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm">Cargando emails...</span>
            </div>
          </div>
        ) : (
          <EmailList
            emails={emails}
            selectedId={selectedEmail?.id || null}
            onSelect={setSelectedEmail}
          />
        )}
      </div>

      {/* Detail panel */}
      {selectedEmail ? (
        <EmailDetail email={selectedEmail} onSendSuccess={handleSendSuccess} />
      ) : (
        <EmailEmptyState />
      )}
    </div>
  );
}
