"use client";

import Link from "next/link";
import {
  Layers,
  Server,
  Database,
  ArrowUpRight,
  FolderKanban,
  Network,
  Activity,
} from "lucide-react";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  networkName: string;
  createdAt: Date | string;
  applications: Array<{
    id: string;
    name: string;
    domains: Array<{ host: string; isPrimary: boolean }>;
  }>;
  addons: Array<{
    id: string;
    type: string;
    name: string;
  }>;
}

interface ProjectsCanvasProps {
  projects: ProjectItem[];
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export function ProjectsCanvas({ projects, user }: ProjectsCanvasProps) {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <FolderKanban className="w-6 h-6 text-indigo-500" />
            <span>Projects</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your project environments, deployed web applications, and database add-ons.
          </p>
        </div>
        <CreateProjectModal />
      </div>

      {/* Projects Grid or Empty State */}
      {projects.length === 0 ? (
        <Card className="border-dashed p-12 text-center bg-card/50">
          <div className="w-12 h-12 rounded-xl bg-secondary mx-auto flex items-center justify-center mb-4 text-muted-foreground">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            No projects created yet
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            Get started by creating your first project environment to group applications and databases together.
          </p>
          <div className="mt-6 flex justify-center">
            <CreateProjectModal />
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group block transition-all focus:outline-none"
            >
              <Card className="h-full hover:-translate-y-1 hover:shadow-md hover:border-indigo-500/40 dark:hover:border-indigo-500/40 transition-all duration-200 flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                      {project.name}
                    </CardTitle>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                  <CardDescription className="line-clamp-2 mt-1">
                    {project.description || "No description provided."}
                  </CardDescription>
                </CardHeader>

                <CardContent className="py-2">
                  {/* Network Mesh Tag */}
                  <Badge variant="outline" className="font-mono text-[11px] gap-1.5 bg-secondary/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{project.networkName}</span>
                  </Badge>
                </CardContent>

                <CardFooter className="pt-3 border-t border-border/60 text-xs text-muted-foreground flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="inline-flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5" />
                      <span>{project.applications.length} Apps</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5" />
                      <span>{project.addons.length} Addons</span>
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground/75 font-mono">
                    {new Date(project.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
