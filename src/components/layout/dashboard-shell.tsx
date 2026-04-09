"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ProjectProvider, useProject } from "@/contexts/project-context";
import Sidebar from "./sidebar";
import TopBar from "./topbar";
import type { Project } from "@/types/database";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { setProjects, setActiveProject, activeProject } = useProject();
  const supabase = createClient();

  useEffect(() => {
    async function loadProjects() {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: true });

      if (data && data.length > 0) {
        setProjects(data as Project[]);
        // Set the first active project as default, or first project
        const active = data.find((p: Project) => p.status === "active") || data[0];
        setActiveProject(active as Project);
      }
    }

    loadProjects();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-surface flex">
      <Sidebar />
      <div className="ml-[240px] flex-1 flex flex-col min-h-screen">
        <TopBar />
        <main className="mt-16 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProjectProvider>
      <DashboardContent>{children}</DashboardContent>
    </ProjectProvider>
  );
}
