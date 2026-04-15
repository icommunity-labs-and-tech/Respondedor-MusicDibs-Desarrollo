"use client";

import type { EmailWithDraft } from "@/types/database";

interface EmailListProps {
  emails: EmailWithDraft[];
  selectedId: string | null;
  onSelect: (email: EmailWithDraft) => void;
  onToggleFavorite?: (email: EmailWithDraft) => void;
  checkedIds?: Set<string>;
  onToggleCheck?: (id: string) => void;
  onCheckAll?: () => void;
}

function getStatusBadge(status: string, hasDraft: boolean) {
  if (status === "sent") {
    return { label: "Sent", className: "bg-secondary-fixed text-on-secondary-fixed-variant" };
  }
  if (hasDraft) {
    return { label: "Draft Ready", className: "bg-tertiary-fixed text-on-tertiary-fixed-variant" };
  }
  return { label: "New", className: "bg-primary-fixed text-on-primary-fixed-variant" };
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
  onToggleFavorite,
  checkedIds = new Set(),
  onToggleCheck,
  onCheckAll,
}: EmailListProps) {
  if (emails.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <span className="material-symbols-outlined text-6xl text-outline-variant/40 mb-4">inbox</span>
        <h3 className="text-lg font-bold text-on-surface mb-1">Sin emails pendientes</h3>
        <p className="text-sm text-on-surface-variant max-w-[20rem]">
          Cuando lleguen nuevos emails, aparecerán aquí para que puedas revisarlos y responderlos.
        </p>
      </div>
    );
  }

  const allChecked = emails.length > 0 && emails.every((e) => checkedIds.has(e.id));
  const someChecked = checkedIds.size > 0;

  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      {/* Select-all row — only when bulk selection is enabled */}
      {onCheckAll && <div className="px-4 py-2 flex items-center gap-2 border-b border-outline-variant/10">
        <button
          onClick={onCheckAll}
          className="w-5 h-5 flex items-center justify-center rounded border border-outline-variant/40 hover:border-primary transition-colors shrink-0"
          title={allChecked ? "Deseleccionar todos" : "Seleccionar todos"}
        >
          {allChecked ? (
            <span className="material-symbols-outlined text-sm text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_box</span>
          ) : someChecked ? (
            <span className="material-symbols-outlined text-sm text-primary">indeterminate_check_box</span>
          ) : (
            <span className="material-symbols-outlined text-sm text-outline-variant">check_box_outline_blank</span>
          )}
        </button>
        <span className="text-xs text-on-surface-variant">
          {someChecked ? `${checkedIds.size} seleccionado${checkedIds.size > 1 ? "s" : ""}` : "Seleccionar todos"}
        </span>
      </div>}

      <div className="p-3 space-y-1">
        {emails.map((email) => {
          const isSelected = email.id === selectedId;
          const isChecked = checkedIds.has(email.id);
          const hasDraft = !!email.drafts;
          const badge = getStatusBadge(email.status, hasDraft);

          return (
            <div
              key={email.id}
              className={`relative flex items-start gap-2 rounded-xl transition-all duration-150 group/item
                ${isSelected ? "bg-surface-container-lowest shadow-ambient" : "hover:bg-surface-container-low"}
                ${isChecked ? "ring-1 ring-primary/30 bg-primary/5" : ""}
                ${email.status === "pending" && !hasDraft && !isSelected ? "bg-surface-container-lowest" : ""}`}
            >
              {/* Checkbox — only when bulk selection is enabled */}
              {onToggleCheck && (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleCheck(email.id); }}
                  className={`mt-4 ml-2 w-5 h-5 flex items-center justify-center shrink-0 transition-opacity duration-150
                    ${isChecked ? "opacity-100" : "opacity-0 group-hover/item:opacity-100"}`}
                  title="Seleccionar"
                >
                  <span
                    className={`material-symbols-outlined text-base leading-none ${isChecked ? "text-primary" : "text-outline-variant"}`}
                    style={{ fontVariationSettings: isChecked ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {isChecked ? "check_box" : "check_box_outline_blank"}
                  </span>
                </button>
              )}

              {/* Email row */}
              <button
                onClick={() => onSelect(email)}
                className={`flex-1 text-left p-4 min-w-0 ${onToggleCheck ? "pl-0" : ""}`}
              >
                {/* Top row: sender + star + time */}
                <div className="flex items-center gap-1 mb-1.5">
                  <span className={`text-sm font-semibold truncate flex-1 ${
                    email.status === "pending" && !hasDraft ? "text-on-surface" : "text-on-surface-variant"
                  }`}>
                    {email.from_name || email.from_address}
                  </span>

                  {onToggleFavorite && (
                    <span
                      role="button"
                      onClick={(e) => { e.stopPropagation(); onToggleFavorite(email); }}
                      title={email.is_favorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                      className={`shrink-0 transition-opacity duration-150 cursor-pointer
                        ${email.is_favorite ? "opacity-100" : "opacity-0 group-hover/item:opacity-100"}`}
                    >
                      <span
                        className={`material-symbols-outlined text-base leading-none
                          ${email.is_favorite ? "text-yellow-400" : "text-outline hover:text-yellow-400"}`}
                        style={{ fontVariationSettings: email.is_favorite ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        star
                      </span>
                    </span>
                  )}

                  <span className="text-[0.7rem] text-outline font-medium shrink-0">
                    {timeAgo(email.received_at)}
                  </span>
                </div>

                {/* Subject */}
                <p className={`text-sm truncate mb-2 ${
                  email.status === "pending" && !hasDraft ? "font-semibold text-on-surface" : "text-on-surface-variant"
                }`}>
                  {email.subject}
                </p>

                {/* Preview + badge */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-outline truncate max-w-[70%]">
                    {email.body_text?.substring(0, 80) || "Sin contenido"}
                  </p>
                  <span className={`px-2.5 py-0.5 text-[0.6rem] font-bold rounded-full shrink-0 ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
