"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  const [search, setSearch] = useState("");
  const supabase = createClient();

  // Ref to access current selectedEmail inside loadEmails without stale closure
  const selectedEmailRef = useRef<EmailWithDraft | null>(null);
  selectedEmailRef.current = selectedEmail;

  const loadEmails = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("emails")
      .select("*, drafts!drafts_email_id_fkey(*)")
      .eq("project_id", activeProject.id)
      .in("status", ["pending", "draft_ready"])
      .order("received_at", { ascending: false });

    if (data) {
      // Normalize: Supabase may return drafts as array OR single object
      // (object when using FK hint + unique constraint on email_id)
      const normalized = data.map((email: Record<string, unknown>) => {
        const rawDrafts = email.drafts;
        let draft = null;
        if (Array.isArray(rawDrafts) && rawDrafts.length > 0) {
          draft = rawDrafts[0];
        } else if (rawDrafts && !Array.isArray(rawDrafts)) {
          draft = rawDrafts; // PostgREST returned a single object
        }
        return { ...email, drafts: draft };
      }) as EmailWithDraft[];
      setEmails(normalized);

      // Use ref to avoid stale closure — selectedEmail is always current
      const currentSelected = selectedEmailRef.current;
      if (currentSelected) {
        const updated = normalized.find((e) => e.id === currentSelected.id);
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

  const filteredEmails = search.trim()
    ? emails.filter(
        (e) =>
          e.subject.toLowerCase().includes(search.toLowerCase()) ||
          e.from_address.toLowerCase().includes(search.toLowerCase()) ||
          (e.from_name || "").toLowerCase().includes(search.toLowerCase())
      )
    : emails;

  async function handleToggleFavorite(email: EmailWithDraft) {
    await supabase
      .from("emails")
      .update({ is_favorite: !email.is_favorite })
      .eq("id", email.id);
    loadEmails();
  }

  function handleSendSuccess() {
    setSelectedEmail(null);
    loadEmails();
  }

  function handleArchive() {
    setSelectedEmail(null);
    loadEmails();
  }

  function handleDelete() {
    setSelectedEmail(null);
    loadEmails();
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Email list panel */}
      <div className="w-[380px] shrink-0 bg-surface-container-low/50 flex flex-col border-r border-outline-variant/10">
        {/* List header */}
        <div className="p-4 pb-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-on-surface">Pendientes</h3>
            <span className="text-xs text-on-surface-variant font-medium">
              {filteredEmails.length} {filteredEmails.length === 1 ? "email" : "emails"}
            </span>
          </div>

          {/* Search */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-lg">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por asunto o remitente..."
              className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest text-on-surface text-sm rounded-lg
                         border border-transparent outline-none transition-all
                         focus:border-primary focus:shadow-[0_0_0_4px_rgba(0,74,198,0.1)]
                         placeholder:text-outline"
            />
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
            emails={filteredEmails}
            selectedId={selectedEmail?.id || null}
            onSelect={setSelectedEmail}
            onToggleFavorite={handleToggleFavorite}
          />
        )}
      </div>

      {/* Detail panel */}
      {selectedEmail ? (
        <EmailDetail email={selectedEmail} onSendSuccess={handleSendSuccess} onDraftGenerated={loadEmails} onArchive={handleArchive} onDelete={handleDelete} />
      ) : (
        <EmailEmptyState />
      )}
    </div>
  );
}
