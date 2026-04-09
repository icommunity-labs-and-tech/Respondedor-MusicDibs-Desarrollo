"use client";

import { useState, useEffect } from "react";
import type { EmailWithDraft } from "@/types/database";
import DraftEditor from "./draft-editor";

interface EmailDetailProps {
  email: EmailWithDraft;
  onSendSuccess: () => void;
}

export default function EmailDetail({ email, onSendSuccess }: EmailDetailProps) {
  const [showOriginal, setShowOriginal] = useState(true);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Email Header */}
      <div className="p-6 pb-4 border-b border-outline-variant/10">
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-xl font-bold text-on-surface leading-tight pr-4">
            {email.subject}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            <button
              className="p-1.5 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors"
              title="Archivar"
            >
              <span className="material-symbols-outlined text-lg">archive</span>
            </button>
            <button
              className="p-1.5 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors"
              title="Marcar como leído"
            >
              <span className="material-symbols-outlined text-lg">
                mark_email_read
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          {/* Sender avatar */}
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
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        {/* Toggle: Original / Response */}
        <div className="sticky top-0 bg-surface/90 backdrop-blur-sm z-10 px-6 py-3 flex items-center gap-2">
          <button
            onClick={() => setShowOriginal(true)}
            className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors
              ${
                showOriginal
                  ? "text-primary bg-primary-fixed/40"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
          >
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">mail</span>
              Email original
            </span>
          </button>
          <button
            onClick={() => setShowOriginal(false)}
            className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors
              ${
                !showOriginal
                  ? "text-primary bg-primary-fixed/40"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
          >
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">
                edit_note
              </span>
              Respuesta AI
              {email.drafts && (
                <span className="w-2 h-2 bg-tertiary rounded-full" />
              )}
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {showOriginal ? (
            /* Original email body */
            <div className="bg-surface-container-lowest rounded-xl p-6 border-ghost">
              {email.body_html ? (
                <div
                  className="prose prose-sm max-w-none text-on-surface
                             prose-headings:font-headline prose-a:text-primary"
                  dangerouslySetInnerHTML={{ __html: email.body_html }}
                />
              ) : (
                <pre className="text-sm text-on-surface whitespace-pre-wrap font-body leading-relaxed">
                  {email.body_text || "Sin contenido"}
                </pre>
              )}
            </div>
          ) : (
            /* Draft editor */
            <DraftEditor email={email} onSendSuccess={onSendSuccess} />
          )}
        </div>
      </div>
    </div>
  );
}
