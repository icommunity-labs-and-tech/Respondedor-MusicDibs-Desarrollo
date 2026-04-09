"use client";

import type { EmailWithDraft } from "@/types/database";

interface SentDetailProps {
  email: EmailWithDraft;
}

export default function SentDetail({ email }: SentDetailProps) {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Email Header */}
      <div className="p-6 pb-4 border-b border-outline-variant/10">
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-xl font-bold text-on-surface leading-tight pr-4">
            {email.subject}
          </h2>
          <span className="px-3 py-1 bg-secondary-fixed text-on-secondary-fixed-variant text-[0.65rem] font-bold rounded-full shrink-0">
            SENT
          </span>
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
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Original email */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-base text-on-surface-variant">
              mail
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              Email recibido
            </span>
          </div>
          <div className="bg-surface-container-low rounded-xl p-5">
            {email.body_html ? (
              <div
                className="prose prose-sm max-w-none text-on-surface prose-a:text-primary"
                dangerouslySetInnerHTML={{ __html: email.body_html }}
              />
            ) : (
              <pre className="text-sm text-on-surface whitespace-pre-wrap font-body leading-relaxed">
                {email.body_text || "Sin contenido"}
              </pre>
            )}
          </div>
        </div>

        {/* Sent response */}
        {email.drafts && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-tertiary">
                  reply
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                  Respuesta enviada
                </span>
              </div>
              {email.drafts.sent_at && (
                <span className="text-xs text-outline">
                  Enviado el{" "}
                  {new Date(email.drafts.sent_at).toLocaleString("es-ES", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
            <div className="bg-surface-container-lowest rounded-xl p-5 border-ghost">
              <pre className="text-sm text-on-surface whitespace-pre-wrap font-body leading-relaxed">
                {email.drafts.edited_response}
              </pre>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-4 mt-3 px-1">
              <span className="text-[0.65rem] text-outline flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">
                  psychology
                </span>
                {email.drafts.model_used}
              </span>
              {email.drafts.tokens_used && (
                <span className="text-[0.65rem] text-outline flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">
                    token
                  </span>
                  {email.drafts.tokens_used.toLocaleString()} tokens
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
