"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProject } from "@/contexts/project-context";
import type { Project, EmailAccount } from "@/types/database";

export default function SettingsPage() {
  const { projects, activeProject } = useProject();
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [checkingEmails, setCheckingEmails] = useState(false);
  const [checkResult, setCheckResult] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const supabase = createClient();

  // Load email accounts
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("email_accounts")
        .select("*")
        .order("created_at");
      if (data) setEmailAccounts(data as EmailAccount[]);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Trigger manual email check
  async function handleCheckEmails() {
    setCheckingEmails(true);
    setCheckResult(null);
    try {
      const res = await fetch("/api/emails/check", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setCheckResult({
          message: `Check completado: ${data.newEmails || 0} nuevos emails procesados.`,
          type: "success",
        });
      } else {
        setCheckResult({
          message: data.error || "Error al verificar emails",
          type: "error",
        });
      }
    } catch {
      setCheckResult({
        message: "Error de conexión al verificar emails",
        type: "error",
      });
    } finally {
      setCheckingEmails(false);
    }
  }

  // Find email account for active project
  const activeAccount = emailAccounts.find(
    (a) => a.project_id === activeProject?.id
  );

  return (
    <div className="p-10 max-w-6xl mx-auto w-full space-y-10">
      {/* Header */}
      <header>
        <h2 className="text-3xl font-extrabold tracking-tight text-on-surface mb-2">
          System Architecture
        </h2>
        <p className="text-on-surface-variant max-w-[42rem]">
          Manage your AI deployment configurations, active projects, and secure
          email server connections from this central hub.
        </p>
      </header>

      {/* Bento Grid — Top Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Projects (2/3 width) */}
        <section className="lg:col-span-2 bg-surface-container-lowest p-8 rounded-xl ring-1 ring-outline-variant/15 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">
                folder_managed
              </span>
              <h3 className="text-xl font-bold">Active Projects</h3>
            </div>
          </div>
          <div className="space-y-4">
            {projects.map((project: Project) => (
              <div
                key={project.id}
                className="group flex items-center justify-between p-4 rounded-xl transition-colors hover:bg-surface-container-low"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center font-black text-lg"
                    style={{ backgroundColor: project.logo_bg_color }}
                  >
                    {project.logo_letter}
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface">{project.name}</h4>
                    <p className="text-sm text-on-surface-variant">
                      {project.email_address}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-3 py-1 text-[0.7rem] font-bold rounded-full uppercase ${
                      project.status === "active"
                        ? "bg-tertiary-fixed text-on-tertiary-fixed-variant"
                        : "bg-surface-container-high text-on-surface-variant"
                    }`}
                  >
                    {project.status}
                  </span>
                  <span className="material-symbols-outlined text-outline cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                    more_vert
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* AI Core (1/3 width — dark panel) */}
        <section className="bg-[#131b2e] text-white p-8 rounded-xl flex flex-col shadow-2xl">
          <div className="flex items-center gap-3 mb-8">
            <span className="material-symbols-outlined text-tertiary-fixed">
              psychology
            </span>
            <h3 className="text-xl font-bold">AI Core</h3>
          </div>
          <div className="space-y-8 flex-1">
            {/* Model */}
            <div>
              <label className="block text-[0.7rem] font-bold uppercase tracking-widest text-slate-400 mb-2">
                Active Intelligence Model
              </label>
              <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center justify-between">
                <span className="font-medium text-sm">Claude Sonnet 4</span>
                <span className="material-symbols-outlined text-slate-400 text-lg">
                  expand_more
                </span>
              </div>
            </div>

            {/* API Status */}
            <div className="p-6 bg-gradient-to-br from-white/5 to-white/[0.02] rounded-xl border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium">API Connection</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-[0.7rem] font-bold text-emerald-400">
                    OPERATIONAL
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full w-[94%] bg-emerald-400 rounded-full" />
                </div>
                <div className="flex justify-between text-[0.65rem] text-slate-500 font-medium">
                  <span>Model: claude-sonnet-4-20250514</span>
                  <span>Ready</span>
                </div>
              </div>
            </div>
          </div>

          {/* Manual check trigger */}
          <button
            onClick={handleCheckEmails}
            disabled={checkingEmails}
            className="mt-8 py-3 w-full bg-white/10 hover:bg-white/15 text-white text-sm font-bold rounded-xl transition-colors
                       disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {checkingEmails ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Checking emails...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">
                  sync
                </span>
                Check Emails Now
              </>
            )}
          </button>

          {/* Check result */}
          {checkResult && (
            <div
              className={`mt-3 p-3 rounded-xl text-sm font-medium ${
                checkResult.type === "success"
                  ? "bg-emerald-400/10 text-emerald-400"
                  : "bg-red-400/10 text-red-400"
              }`}
            >
              {checkResult.message}
            </div>
          )}
        </section>
      </div>

      {/* Email Server Configuration — Full Width */}
      <section className="bg-surface-container-low p-8 rounded-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">dns</span>
            <div>
              <h3 className="text-xl font-bold">Email Server Configuration</h3>
              <p className="text-sm text-on-surface-variant">
                Secure IMAP/SMTP bridge for message synchronization
              </p>
            </div>
          </div>
        </div>

        {activeAccount ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/10">
              <label className="block text-[0.7rem] font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                IMAP Host
              </label>
              <p className="font-mono text-sm text-on-surface">
                {activeAccount.imap_host}
              </p>
            </div>
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/10">
              <label className="block text-[0.7rem] font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                SMTP Host
              </label>
              <p className="font-mono text-sm text-on-surface">
                {activeAccount.smtp_host}
              </p>
            </div>
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/10">
              <label className="block text-[0.7rem] font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                Username
              </label>
              <p className="font-mono text-sm text-on-surface">
                {activeAccount.email_user}
              </p>
            </div>
            <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/10">
              <label className="block text-[0.7rem] font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="flex items-center justify-between">
                <p className="font-mono text-sm text-on-surface">
                  ••••••••••••••••
                </p>
                <span className="material-symbols-outlined text-outline text-sm cursor-pointer">
                  visibility
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl text-outline-variant/40 mb-3 block">
              link_off
            </span>
            <p className="text-sm">
              No email account configured for{" "}
              <strong>{activeProject?.name || "this project"}</strong>.
            </p>
          </div>
        )}
      </section>

      {/* Bottom Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-10">
        {/* Cron Job Info */}
        <div className="p-8 rounded-xl bg-surface-container-lowest ring-1 ring-outline-variant/10 group cursor-pointer hover:shadow-xl hover:shadow-primary/5 transition-all">
          <div className="w-12 h-12 bg-primary-fixed rounded-xl flex items-center justify-center text-primary mb-6">
            <span className="material-symbols-outlined">schedule</span>
          </div>
          <h4 className="text-lg font-bold mb-2">Cron Job</h4>
          <p className="text-on-surface-variant text-sm mb-4">
            Automatic email check runs every hour via Vercel Cron.
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-[0.7rem] font-bold text-on-surface-variant uppercase">
                Endpoint:
              </span>
              <code className="text-xs bg-surface-container-low px-2 py-1 rounded-md font-mono">
                /api/cron/check-emails
              </code>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[0.7rem] font-bold text-on-surface-variant uppercase">
                Schedule:
              </span>
              <code className="text-xs bg-surface-container-low px-2 py-1 rounded-md font-mono">
                0 * * * *
              </code>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[0.7rem] font-bold text-on-surface-variant uppercase">
                Security:
              </span>
              <span className="text-xs text-on-surface-variant">
                CRON_SECRET header required
              </span>
            </div>
          </div>
        </div>

        {/* Data & Privacy */}
        <div className="p-8 rounded-xl bg-surface-container-lowest ring-1 ring-outline-variant/10 group cursor-pointer hover:shadow-xl hover:shadow-secondary/5 transition-all">
          <div className="w-12 h-12 bg-secondary-fixed rounded-xl flex items-center justify-center text-secondary mb-6">
            <span className="material-symbols-outlined">security</span>
          </div>
          <h4 className="text-lg font-bold mb-2">Data & Privacy</h4>
          <p className="text-on-surface-variant text-sm mb-4">
            Email data is processed via Supabase with Row Level Security.
            AI responses use Claude with project-specific context only.
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full" />
              <span className="text-on-surface-variant text-xs">
                RLS enabled on all tables
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full" />
              <span className="text-on-surface-variant text-xs">
                Credentials stored as env variables
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full" />
              <span className="text-on-surface-variant text-xs">
                No email data sent to third parties
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
