"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProject } from "@/contexts/project-context";
import ProjectSelector from "./project-selector";

export default function TopBar() {
  const pathname = usePathname();
  const { activeProject } = useProject();

  const tabs = [
    { href: "/inbox", label: "Pending" },
    { href: "/sent", label: "Sent" },
  ];

  // Don't show tabs on settings page
  const showTabs = !pathname.startsWith("/settings");

  return (
    <header className="fixed top-0 right-0 w-[calc(100%-240px)] h-16 bg-surface/80 backdrop-blur-md z-40 flex justify-between items-center px-8">
      <div className="flex items-center gap-6">
        {/* Project selector */}
        <ProjectSelector />

        {/* Tabs */}
        {showTabs && (
          <nav className="hidden md:flex items-center gap-1">
            {tabs.map((tab) => {
              const isActive = pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors
                    ${
                      isActive
                        ? "text-primary bg-primary-fixed/40"
                        : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low"
                    }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors">
          <span className="material-symbols-outlined text-xl">
            notifications
          </span>
        </button>
        <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors">
          <span className="material-symbols-outlined text-xl">help</span>
        </button>
        <div className="h-8 w-8 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed-variant text-xs font-bold">
          D
        </div>
      </div>
    </header>
  );
}
