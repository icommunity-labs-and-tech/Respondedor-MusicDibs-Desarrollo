"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Project } from "@/types/database";

interface ProjectContextType {
  activeProject: Project | null;
  projects: Project[];
  setActiveProject: (project: Project) => void;
  setProjects: (projects: Project[]) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  const setActiveProject = useCallback((project: Project) => {
    setActiveProjectState(project);
  }, []);

  return (
    <ProjectContext.Provider
      value={{ activeProject, projects, setActiveProject, setProjects }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}
