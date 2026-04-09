"use client";

import { useState, useRef, useEffect } from "react";
import { useProject } from "@/contexts/project-context";

export default function ProjectSelector() {
  const { activeProject, projects, setActiveProject } = useProject();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!activeProject) return null;

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-surface-container-low transition-colors"
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
          style={{ backgroundColor: activeProject.logo_bg_color }}
        >
          {activeProject.logo_letter}
        </div>
        <span className="text-lg font-bold text-on-surface">
          {activeProject.name}
        </span>
        <span className="material-symbols-outlined text-on-surface-variant text-lg">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-surface-container-lowest rounded-xl shadow-[0_0_32px_rgba(25,28,30,0.08)] border border-outline-variant/15 py-2 z-50">
          <div className="px-4 py-2 mb-1">
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface-variant">
              Switch Project
            </p>
          </div>
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => {
                setActiveProject(project);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left
                ${
                  project.id === activeProject.id
                    ? "bg-primary-fixed/30"
                    : "hover:bg-surface-container-low"
                }`}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black"
                style={{ backgroundColor: project.logo_bg_color }}
              >
                {project.logo_letter}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-on-surface">
                  {project.name}
                </p>
                <p className="text-xs text-on-surface-variant truncate">
                  {project.email_address}
                </p>
              </div>
              <span
                className={`px-2.5 py-0.5 text-[0.6rem] font-bold rounded-full uppercase
                  ${
                    project.status === "active"
                      ? "bg-tertiary-fixed text-on-tertiary-fixed-variant"
                      : "bg-surface-container-high text-on-surface-variant"
                  }`}
              >
                {project.status}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
