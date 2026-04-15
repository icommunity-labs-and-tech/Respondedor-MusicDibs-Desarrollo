"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { EmailWithDraft } from "@/types/database";

interface DraftEditorProps {
  email: EmailWithDraft;
  onSendSuccess: () => void;
  onDraftGenerated: () => void;
}

type AIProvider = "claude" | "gemini";

const PROVIDERS: { id: AIProvider; label: string; icon: string }[] = [
  { id: "claude", label: "Claude", icon: "auto_awesome" },
  { id: "gemini", label: "Gemini", icon: "diamond" },
];

export default function DraftEditor({ email, onSendSuccess, onDraftGenerated }: DraftEditorProps) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [improving, setImproving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<AIProvider>("claude");
  const supabase = createClient();

  // Load draft content
  useEffect(() => {
    if (email.drafts) {
      setContent(email.drafts.edited_response);
    } else {
      setContent("");
    }
    setError(null);
  }, [email.id, email.drafts]);

  // Auto-save draft on content change (debounced)
  const saveDraft = useCallback(
    async (text: string) => {
      if (!email.drafts) return;
      setSaving(true);
      const { error } = await supabase
        .from("drafts")
        .update({ edited_response: text })
        .eq("id", email.drafts.id);

      if (!error) {
        setLastSaved(new Date());
      }
      setSaving(false);
    },
    [email.drafts, supabase]
  );

  useEffect(() => {
    if (!email.drafts || content === email.drafts.edited_response) return;
    const timer = setTimeout(() => saveDraft(content), 1500);
    return () => clearTimeout(timer);
  }, [content, saveDraft, email.drafts]);

  // Check if content has been manually edited vs original AI response
  const isEdited = email.drafts
    ? content !== email.drafts.ai_response
    : false;

  // Improve current draft with AI
  async function handleImprove() {
    if (!content.trim()) return;
    setImproving(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId: email.id, currentContent: content }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.details || data.error || "Error al mejorar");
      }
      const data = await res.json();
      setContent(data.improved);
      setLastSaved(new Date());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setImproving(false);
    }
  }

  // Regenerate AI response
  async function handleRegenerate() {
    setRegenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId: email.id, provider }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.details || data.error || "Error al regenerar");
      }
      // Notify parent to refresh email data (keeps email selected)
      onDraftGenerated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setRegenerating(false);
    }
  }

  // Send email
  async function handleSend() {
    if (!content.trim()) {
      setError("La respuesta no puede estar vacía");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailId: email.id,
          draftId: email.drafts?.id,
          content: content,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al enviar");
      }
      onSendSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSending(false);
    }
  }

  // Provider selector (reusable)
  const ProviderSelector = () => (
    <div className="flex items-center gap-1 p-1 bg-surface-container-high rounded-lg">
      {PROVIDERS.map((p) => (
        <button
          key={p.id}
          onClick={() => setProvider(p.id)}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all
            ${provider === p.id
              ? "bg-surface text-on-surface shadow-sm"
              : "text-on-surface-variant hover:text-on-surface"
            }`}
        >
          <span className="material-symbols-outlined text-sm">{p.icon}</span>
          {p.label}
        </button>
      ))}
    </div>
  );

  // No draft yet
  if (!email.drafts) {
    return (
      <div className="bg-surface-container-lowest rounded-xl p-8 border-ghost text-center">
        <span className="material-symbols-outlined text-5xl text-outline-variant/40 mb-4 block">
          psychology
        </span>
        <h3 className="text-lg font-bold text-on-surface mb-2">
          Sin borrador AI
        </h3>
        <p className="text-sm text-on-surface-variant mb-4 max-w-[28rem] mx-auto">
          Este email aún no tiene una respuesta generada por IA. Elige el modelo y genera una ahora.
        </p>
        <div className="flex items-center justify-center mb-6">
          <ProviderSelector />
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="px-6 py-2.5 btn-primary-gradient text-white text-sm font-bold rounded-xl
                       shadow-lg transition-all hover:shadow-xl active:scale-[0.98]
                       disabled:opacity-60"
          >
            {regenerating ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base">psychology</span>
                Generar con {PROVIDERS.find(p => p.id === provider)?.label}
              </span>
            )}
          </button>
        </div>
        {error && (
          <div className="mt-4 flex items-center justify-center gap-2 text-error text-sm">
            <span className="material-symbols-outlined text-base">error</span>
            {error}
          </div>
        )}
      </div>
    );
  }

  // Has draft — show editor
  return (
    <div className="space-y-4">
      {/* Editor toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Respuesta
          </span>
          <span className="text-[0.6rem] px-2 py-0.5 bg-surface-container-high rounded-full text-on-surface-variant font-medium">
            {email.drafts.model_used}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ProviderSelector />
          <div className="flex items-center gap-2 text-xs text-outline">
            {saving && (
              <span className="flex items-center gap-1">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Guardando...
              </span>
            )}
            {lastSaved && !saving && (
              <span>
                Guardado{" "}
                {lastSaved.toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={14}
          className="w-full p-6 bg-surface-container-lowest text-on-surface text-sm leading-relaxed
                     rounded-xl border border-transparent resize-none
                     transition-all duration-200
                     focus:border-primary focus:shadow-[0_0_0_4px_rgba(0,74,198,0.1)]
                     placeholder:text-outline outline-none"
          placeholder="Escribe o edita la respuesta aquí..."
        />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-error-container/50 rounded-xl">
          <span className="material-symbols-outlined text-error text-lg">
            error
          </span>
          <p className="text-on-error-container text-sm">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleRegenerate}
            disabled={regenerating || improving}
            className="px-4 py-2 text-on-surface-variant text-sm font-semibold rounded-xl
                       border border-outline-variant/20 hover:bg-surface-container-low
                       transition-all disabled:opacity-60 flex items-center gap-2"
          >
            {regenerating ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Regenerando...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">refresh</span>
                Regenerar
              </>
            )}
          </button>

          {isEdited && (
            <button
              onClick={handleImprove}
              disabled={improving || regenerating}
              className="px-4 py-2 text-primary text-sm font-semibold rounded-xl
                         border border-primary/20 hover:bg-primary/5
                         transition-all disabled:opacity-60 flex items-center gap-2"
            >
              {improving ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Mejorando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">auto_fix_high</span>
                  Mejorar
                </>
              )}
            </button>
          )}
        </div>

        <button
          onClick={handleSend}
          disabled={sending || !content.trim()}
          className="px-8 py-2.5 btn-primary-gradient text-white text-sm font-bold rounded-xl
                     shadow-lg transition-all hover:shadow-xl hover:shadow-primary/20
                     active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed
                     flex items-center gap-2"
        >
          {sending ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Enviando...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-base">send</span>
              Enviar
            </>
          )}
        </button>
      </div>
    </div>
  );
}
