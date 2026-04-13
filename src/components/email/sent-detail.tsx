"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { EmailWithDraft, ThreadMessage } from "@/types/database";
import ThreadView from "./thread-view";

interface SentDetailProps {
  email: EmailWithDraft;
  onArchive?: () => void;
}

export default function SentDetail({ email, onArchive }: SentDetailProps) {
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [archiving, setArchiving] = useState(false);
  const supabase = createClient();

  async function handleArchive() {
    if (archiving) return;
    setArchiving(true);
    try {
      const res = await fetch("/api/emails/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId: email.id }),
      });
      if (res.ok && onArchive) onArchive();
    } finally {
      setArchiving(false);
    }
  }

  useEffect(() => {
    loadThread();
  }, [email.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadThread() {
    const normalizedSubject = email.subject.replace(/^(Re|RE|Fwd|FWD):\s*/g, "").trim();

    const { data: relatedEmails } = await supabase
      .from("emails")
      .select("*, drafts!drafts_email_id_fkey(*)")
      .eq("project_id", email.project_id)
      .ilike("subject", `%${normalizedSubject}%`)
      .order("received_at", { ascending: true });

    if (!relatedEmails) return;

    const messages: ThreadMessage[] = relatedEmails.flatMap((e) => {
      const draft = Array.isArray(e.drafts)
        ? e.drafts[0] ?? null
        : e.drafts ?? null;

      const received: ThreadMessage = { type: "received", email: e };
      if (e.status === "sent" && draft) {
        return [received, { type: "sent", email: e, draft } as ThreadMessage];
      }
      return [received];
    });

    setThread(messages);
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-outline-variant/10">
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-xl font-bold text-on-surface leading-tight pr-4">
            {email.subject}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            {email.status !== "archived" && (
              <button
                onClick={handleArchive}
                disabled={archiving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors disabled:opacity-50"
                title="Archivar"
              >
                <span className="material-symbols-outlined text-lg">archive</span>
                <span className="text-xs">{archiving ? "Archivando..." : "Archivar"}</span>
              </button>
            )}
            <span className="px-3 py-1 bg-secondary-fixed text-on-secondary-fixed-variant text-[0.65rem] font-bold rounded-full">
              SENT
            </span>
            {thread.length > 1 && (
              <span className="px-3 py-1 bg-primary-fixed/30 text-primary text-[0.65rem] font-bold rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">forum</span>
                {thread.length} mensajes
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed-variant font-bold text-sm shrink-0">
            {(email.from_name || email.from_address).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-on-surface truncate">
              {email.from_name || email.from_address}
            </p>
            <p className="text-xs text-on-surface-variant truncate">
              {email.from_address} → {email.to_address}
            </p>
          </div>
          <p className="text-xs text-outline ml-auto shrink-0">
            {new Date(email.received_at).toLocaleString("es-ES", {
              day: "numeric", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {/* Thread */}
      <div className="flex-1 overflow-y-auto p-6">
        <ThreadView messages={thread} />
      </div>
    </div>
  );
}
