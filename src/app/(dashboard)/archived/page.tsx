"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProject } from "@/contexts/project-context";
import EmailList from "@/components/email/email-list";
import SentDetail from "@/components/email/sent-detail";
import type { EmailWithDraft } from "@/types/database";

export default function ArchivedPage() {
  const { activeProject } = useProject();
  const [emails, setEmails] = useState<EmailWithDraft[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailWithDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const supabase = createClient();

  const loadEmails = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);

    const { data } = await supabase
      .from("emails")
      .select("*, drafts!drafts_email_id_fkey(*)")
      .eq("project_id", activeProject.id)
      .eq("status", "archived")
      .order("updated_at", { ascending: false });

    if (data) {
      const normalized = data.map((email: Record<string, unknown>) => ({
        ...email,
        drafts: Array.isArray(email.drafts)
          ? (email.drafts.length > 0 ? email.drafts[0] : null)
          : (email.drafts ?? null),
      })) as EmailWithDraft[];
      setEmails(normalized);

      if (selectedEmail) {
        const updated = normalized.find((e) => e.id === selectedEmail.id);
        if (updated) setSelectedEmail(updated);
        else setSelectedEmail(null);
      }
    }
    setLoading(false);
  }, [activeProject, supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadEmails();
    setSelectedEmail(null);
  }, [activeProject?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time: remove from list if status changes away from archived
  useEffect(() => {
    const channel = supabase
      .channel("archived-emails")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "emails" }, () => {
        loadEmails();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadEmails]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredEmails = search.trim()
    ? emails.filter(
        (e) =>
          e.subject.toLowerCase().includes(search.toLowerCase()) ||
          e.from_address.toLowerCase().includes(search.toLowerCase()) ||
          (e.from_name || "").toLowerCase().includes(search.toLowerCase())
      )
    : emails;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Email list panel */}
      <div className="w-[380px] shrink-0 bg-surface-container-low/50 flex flex-col border-r border-outline-variant/10">
        <div className="p-4 pb-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-on-surface">Archivados</h3>
            <span className="text-xs text-on-surface-variant font-medium">
              {filteredEmails.length} {filteredEmails.length === 1 ? "email" : "emails"}
            </span>
          </div>

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
          />
        )}
      </div>

      {/* Detail panel */}
      {selectedEmail ? (
        <SentDetail email={selectedEmail} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-surface-container-low/50">
          <span className="material-symbols-outlined text-7xl text-outline-variant/30 mb-6">
            archive
          </span>
          <h3 className="text-xl font-bold text-on-surface mb-2">
            Archivados
          </h3>
          <p className="text-sm text-on-surface-variant max-w-[24rem]">
            Aquí aparecen los emails que has archivado. Se han eliminado del servidor IMAP
            pero puedes consultarlos en cualquier momento.
          </p>
        </div>
      )}
    </div>
  );
}
