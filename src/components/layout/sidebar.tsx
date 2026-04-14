"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth/actions";

const navItems = [
  { href: "/inbox", icon: "inbox", label: "Inbox" },
  { href: "/sent", icon: "send", label: "Sent" },
  { href: "/favoritos", icon: "star", label: "Favoritos" },
  { href: "/archived", icon: "archive", label: "Archivados" },
  { href: "/settings", icon: "settings", label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-[#131b2e] flex flex-col py-6 px-4 z-50">
      {/* Brand */}
      <div className="mb-10 px-2">
        <h1 className="text-xl font-extrabold text-white tracking-tight">
          The Monolith
        </h1>
        <p className="text-[0.75rem] text-slate-400 font-medium">
          AI Email Manager
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group
                ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
            >
              <span className="material-symbols-outlined text-xl">
                {item.icon}
              </span>
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="mt-auto space-y-4 px-2">
        <Link
          href="/inbox"
          className="block w-full py-2.5 px-4 btn-primary-gradient text-white text-sm font-bold rounded-xl
                     shadow-lg text-center transition-transform active:scale-95"
        >
          New Response
        </Link>

        <div className="pt-6 border-t border-white/10 space-y-1">
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 py-2 px-1 text-slate-400 hover:text-white transition-colors w-full"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
