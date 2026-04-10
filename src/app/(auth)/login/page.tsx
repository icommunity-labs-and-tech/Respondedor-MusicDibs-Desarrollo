"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Credenciales incorrectas. Inténtalo de nuevo.");
      setLoading(false);
      return;
    }

    router.push("/inbox");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — The Monolith Brand */}
      <div className="hidden lg:flex lg:w-[480px] bg-[#131b2e] flex-col justify-between p-12">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            The Monolith
          </h1>
          <p className="text-sm text-slate-400 font-medium mt-1">
            AI Email Manager
          </p>
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-[#6ffbbe]">
                psychology
              </span>
              <span className="text-white font-bold">Respuesta inteligente</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              IA que entiende el contexto de tu producto y genera respuestas
              profesionales para cada email entrante.
            </p>
          </div>

          <div className="p-6 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-[#b4c5ff]">
                speed
              </span>
              <span className="text-white font-bold">Multi-proyecto</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Gestiona emails de diferentes productos desde un solo panel.
              Cada proyecto con su propio contexto AI.
            </p>
          </div>
        </div>

        <p className="text-slate-600 text-xs">
          © {new Date().getFullYear()} iCommunity Labs
        </p>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center bg-surface p-8">
        <div className="w-full max-w-[28rem] space-y-8">
          {/* Mobile brand (visible only on small screens) */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-2xl font-extrabold text-on-surface tracking-tight">
              The Monolith
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              AI Email Manager
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-on-surface tracking-tight">
              Acceder al backoffice
            </h2>
            <p className="text-on-surface-variant text-sm mt-2">
              Introduce tus credenciales para gestionar las respuestas de email.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email field */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="development@respondedor.app"
                required
                className="w-full px-4 py-3 bg-surface-container-lowest text-on-surface text-sm rounded-xl
                           outline-none border border-transparent
                           transition-all duration-200
                           focus:border-primary focus:shadow-[0_0_0_4px_rgba(0,74,198,0.1)]
                           placeholder:text-outline"
              />
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                required
                className="w-full px-4 py-3 bg-surface-container-lowest text-on-surface text-sm rounded-xl
                           outline-none border border-transparent
                           transition-all duration-200
                           focus:border-primary focus:shadow-[0_0_0_4px_rgba(0,74,198,0.1)]
                           placeholder:text-outline"
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-error-container/50 rounded-xl">
                <span className="material-symbols-outlined text-error text-lg">
                  error
                </span>
                <p className="text-on-error-container text-sm">{error}</p>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 btn-primary-gradient text-white text-sm font-bold rounded-xl
                         shadow-lg transition-all duration-200
                         hover:shadow-xl hover:shadow-primary/20
                         active:scale-[0.98]
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Accediendo...
                </span>
              ) : (
                "Acceder"
              )}
            </button>
          </form>

          <div className="pt-6 border-t border-outline-variant/15">
            <p className="text-center text-xs text-outline">
              Sistema de gestión interna — Acceso restringido
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
