"use client";

import type { ThreadMessage } from "@/types/database";

interface ThreadViewProps {
  messages: ThreadMessage[];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ThreadView({ messages }: ThreadViewProps) {
  if (messages.length === 0) return null;

  return (
    <div className="space-y-4">
      {messages.map((msg, i) => {
        const isReceived = msg.type === "received";
        const email = msg.email;
        const senderName = isReceived
          ? email.from_name || email.from_address
          : "Equipo Musicdibs";
        const senderInitial = senderName.charAt(0).toUpperCase();

        return (
          <div key={`${msg.type}-${email.id}`} className="relative">
            {/* Thread connector line */}
            {i < messages.length - 1 && (
              <div className="absolute left-5 top-12 bottom-0 w-px bg-outline-variant/20 z-0" />
            )}

            <div className="relative z-10">
              {/* Message header */}
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0
                    ${isReceived
                      ? "bg-primary-fixed text-on-primary-fixed-variant"
                      : "bg-tertiary-fixed text-on-tertiary-fixed-variant"
                    }`}
                >
                  {senderInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-on-surface text-sm truncate">
                    {senderName}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {isReceived ? email.from_address : email.to_address}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!isReceived && (
                    <span className="px-2 py-0.5 bg-secondary-fixed text-on-secondary-fixed-variant text-[0.6rem] font-bold rounded-full">
                      ENVIADO
                    </span>
                  )}
                  <span className="text-xs text-outline">
                    {formatDate(
                      isReceived
                        ? email.received_at
                        : (msg.draft.sent_at ?? email.received_at)
                    )}
                  </span>
                </div>
              </div>

              {/* Message body */}
              <div className={`ml-[52px] rounded-xl p-4 ${isReceived ? "bg-surface-container-low" : "bg-surface-container-lowest border border-outline-variant/10"}`}>
                {isReceived ? (
                  email.body_html ? (
                    <iframe
                      srcDoc={email.body_html}
                      className="w-full border-0 rounded"
                      style={{ minHeight: "120px" }}
                      sandbox="allow-same-origin"
                      onLoad={(e) => {
                        const iframe = e.currentTarget;
                        const doc = iframe.contentDocument;
                        if (doc) {
                          const h = doc.documentElement.scrollHeight;
                          if (h > 0) iframe.style.height = h + "px";
                        }
                      }}
                    />
                  ) : (
                    <pre className="text-sm text-on-surface whitespace-pre-wrap font-body leading-relaxed">
                      {email.body_text || "Sin contenido"}
                    </pre>
                  )
                ) : (
                  <pre className="text-sm text-on-surface whitespace-pre-wrap font-body leading-relaxed">
                    {msg.draft.edited_response}
                  </pre>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
