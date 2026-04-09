"use client";

import type { EmailWithDraft } from "@/types/database";

interface EmailListProps {
  emails: EmailWithDraft[];
  selectedId: string | null;
  onSelect: (email: EmailWithDraft) => void;
}

function getStatusBadge(status: string, hasDraft: boolean) {
  if (status === "sent") {
    return {
      label: "Sent",
      className: "bg-secondary-fixed text-on-secondary-fixed-variant",
    };
  }
  if (hasDraft) {
    return {
      label: "Draft Ready",
      className: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
    };
  }
  return {
    label: "New",
    className: "bg-primary-fixed text-on-primary-fixed-variant",
  };
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "Ahora";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export default function EmailList({
  emails,
  selectedId,
  onSelect,
}: EmailListProps) {
  if (emails.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <span className="material-symbols-outlined text-6xl text-outline-variant/40 mb-4">
          inbox
        </span>
        <h3 className="text-lg font-bold text-on-surface mb-1">
          Sin emails pendientes
        </h3>
        <p className="text-sm text-on-surface-variant max-w-xs">
          Cuando lleguen nuevos emails, aparecerán aquí para que puedas revisarlos y responderlos.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-3 space-y-1">
        {emails.map((email) => {
          const isSelected = email.id === selectedId;
          const hasDraft = !!email.drafts;
          const badge = getStatusBadge(email.status, hasDraft);

          return (
            <button
              key={email.id}
              onClick={() => onSelect(email)}
              className={`w-full text-left p-4 rounded-xl transition-all duration-150 group
                ${
                  isSelected
                    ? "bg-surface-container-lowest shadow-ambient"
                    : "hover:bg-surface-container-low"
                }
                ${
                  email.status === "pending" && !hasDraft
                    ? "bg-surface-container-lowest"
                    : ""
                }`}
            >
              {/* Top row: sender + time */}
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-sm font-semibold truncate max-w-[60%] ${
                    email.status === "pending" && !hasDraft
                      ? "text-on-surface"
                      : "text-on-surface-variant"
                  }`}
                >
                  {email.from_name || email.from_address}
                </span>
                <span className="text-[0.7rem] text-outline font-medium shrink-0 ml-2">
                  {timeAgo(email.received_at)}
                </span>
              </div>

              {/* Subject */}
              <p
                className={`text-sm truncate mb-2 ${
                  email.status === "pending" && !hasDraft
                    ? "font-semibold text-on-surface"
                    : "text-on-surface-variant"
                }`}
              >
                {email.subject}
              </p>

              {/* Preview + badge */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-outline truncate max-w-[70%]">
                  {email.body_text?.substring(0, 80) || "Sin contenido"}
                </p>
                <span
                  className={`px-2.5 py-0.5 text-[0.6rem] font-bold rounded-full shrink-0 ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
