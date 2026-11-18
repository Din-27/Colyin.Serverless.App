"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  Server,
  Database,
  ArrowUpRight,
  FolderKanban,
  Network,
  Activity,
  Cpu,
  HardDrive,
  LayoutGrid,
  List,
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
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  networkName: string;
  createdAt: Date | string;
  applications: Array<{
    id: string;
    name: string;
    cpuLimit?: number;
    memoryLimitMb?: number;
    storageVolumes?: Array<{ id: string; sizeLimitMb?: number | null }>;
    domains?: Array<{ host: string; isPrimary: boolean }>;
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

function getProjectMetrics(project: ProjectItem) {
  const appCpus = project.applications.reduce((acc, a) => acc + (a.cpuLimit ?? 1.0), 0);
  const addonCpus = project.addons.length * 0.5;
  const totalCores = Number((appCpus + addonCpus).toFixed(1));

  const appMemory = project.applications.reduce((acc, a) => acc + (a.memoryLimitMb ?? 512), 0);
  const addonMemory = project.addons.length * 512;
  const totalMemoryMb = appMemory + addonMemory;
  const formattedMemory =
    totalMemoryMb >= 1024
      ? `${(totalMemoryMb / 1024).toFixed(1)} GB`
      : `${totalMemoryMb} MB`;

  const appStorage = project.applications.reduce(
    (acc, a) =>
      acc +
      (a.storageVolumes?.reduce((sAcc, v) => sAcc + (v.sizeLimitMb ?? 1024), 0) ?? 0),
    0
  );
  const addonStorage = project.addons.length * 1024;
  const totalDiskMb = appStorage + addonStorage;
  const formattedDisk =
    totalDiskMb >= 1024
      ? `${(totalDiskMb / 1024).toFixed(1)} GB`
      : `${totalDiskMb} MB`;

  return {
    totalCores,
    appCpus,
    addonCpus,
    totalMemoryMb,
    formattedMemory,
    totalDiskMb,
    formattedDisk,
    activeServices: project.applications.length + project.addons.length,
  };
}

export function ProjectsCanvas({ projects, user }: ProjectsCanvasProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("colyin-projects-view");
      if (saved === "grid" || saved === "list") {
        setViewMode(saved);
      }
    } catch {}
  }, []);

  const handleToggleView = (mode: "grid" | "list") => {
    setViewMode(mode);
    try {
      localStorage.setItem("colyin-projects-view", mode);
    } catch {}
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <FolderKanban className="w-6 h-6 text-foreground" />
            <span>Projects</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your project environments, resource allocation, deployed web applications, and database add-ons.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Grid vs List View Switcher */}
          <div className="flex items-center p-0.5 rounded-lg border border-border bg-muted/60 shadow-2xs">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => handleToggleView("grid")}
              className={cn(
                "h-8 w-8 rounded-md transition-all",
                viewMode === "grid" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              )}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => handleToggleView("list")}
              className={cn(
                "h-8 w-8 rounded-md transition-all",
                viewMode === "list" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              )}
              title="List View"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          <CreateProjectModal />
        </div>
      </div>

      {/* Projects Grid or List or Empty State */}
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
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => {
            const metrics = getProjectMetrics(project);

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group block transition-all focus:outline-none"
              >
                <Card className="h-full hover:-translate-y-1 hover:shadow-md hover:border-foreground/30 transition-all duration-200 flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base group-hover:text-primary transition-colors flex items-center gap-1.5">
                        {project.name}
                      </CardTitle>
                      <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                    <CardDescription className="line-clamp-2 mt-1">
                      {project.description || "No description provided."}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="py-2 space-y-3.5">
                    {/* Network Mesh Tag */}
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="font-mono text-[11px] gap-1.5 bg-secondary/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>{project.networkName}</span>
                      </Badge>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {metrics.activeServices} Active
                      </span>
                    </div>

                    {/* Resource Usage Breakdown: Core, Memory, Disk */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60">
                      {/* CPU Core */}
                      <HoverCard openDelay={150} className="w-full">
                        <HoverCardTrigger asChild className="w-full block">
                          <div className="w-full h-full min-h-[58px] p-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors border border-border text-center flex flex-col justify-center items-center cursor-help">
                            <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground mb-0.5">
                              <Cpu className="w-3 h-3 text-primary shrink-0" />
                              <span className="font-medium text-foreground">Core</span>
                            </div>
                            <span className="font-mono text-xs font-bold text-foreground">
                              {metrics.totalCores}
                            </span>
                          </div>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-56 text-xs space-y-1">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <Cpu className="w-3.5 h-3.5 text-primary" />
                            <span>CPU Core Quota</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Total {metrics.totalCores} vCPU allocated across {project.applications.length} apps ({metrics.appCpus} cores) and {project.addons.length} database addons ({metrics.addonCpus} cores).
                          </div>
                        </HoverCardContent>
                      </HoverCard>

                      {/* Memory RAM */}
                      <HoverCard openDelay={150} className="w-full">
                        <HoverCardTrigger asChild className="w-full block">
                          <div className="w-full h-full min-h-[58px] p-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors border border-border text-center flex flex-col justify-center items-center cursor-help">
                            <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground mb-0.5">
                              <Activity className="w-3 h-3 text-primary shrink-0" />
                              <span className="font-medium text-foreground">RAM</span>
                            </div>
                            <span className="font-mono text-xs font-bold text-foreground">
                              {metrics.formattedMemory}
                            </span>
                          </div>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-56 text-xs space-y-1">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-primary" />
                            <span>Memory Allocation</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Total {metrics.formattedMemory} assigned RAM limit with active cgroups OOM safeguarding.
                          </div>
                        </HoverCardContent>
                      </HoverCard>

                      {/* Storage Disk */}
                      <HoverCard openDelay={150} className="w-full">
                        <HoverCardTrigger asChild className="w-full block">
                          <div className="w-full h-full min-h-[58px] p-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors border border-border text-center flex flex-col justify-center items-center cursor-help">
                            <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground mb-0.5">
                              <HardDrive className="w-3 h-3 text-primary shrink-0" />
                              <span className="font-medium text-foreground">Disk</span>
                            </div>
                            <span className="font-mono text-xs font-bold text-foreground">
                              {metrics.formattedDisk}
                            </span>
                          </div>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-56 text-xs space-y-1">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <HardDrive className="w-3.5 h-3.5 text-primary" />
                            <span>Persistent Volumes</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Total {metrics.formattedDisk} storage capacity configured across project database data stores and persistent mounts.
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-3 border-t border-border/60 text-xs text-muted-foreground flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="inline-flex items-center gap-1.5">
                        <Server className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{project.applications.length} Apps</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{project.addons.length} Addons</span>
                      </span>
                    </div>
                    <span className="text-[11px] opacity-75">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </CardFooter>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="space-y-3">
          {projects.map((project) => {
            const metrics = getProjectMetrics(project);

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group block transition-all focus:outline-none"
              >
                <div className="p-4 sm:p-5 rounded-xl border border-border bg-card hover:border-foreground/30 hover:shadow-xs transition-all duration-150 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Project Info */}
                  <div className="min-w-0 md:w-1/3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate text-base">
                        {project.name}
                      </h3>
                      <Badge variant="outline" className="font-mono text-[10px] gap-1 shrink-0 bg-secondary/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>{project.networkName}</span>
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {project.description || "No description provided."}
                    </p>
                  </div>

                  {/* Middle: Resource Metrics */}
                  <div className="flex items-center gap-3 sm:gap-4 shrink-0 flex-wrap">
                    {/* CPU */}
                    <HoverCard openDelay={150}>
                      <HoverCardTrigger asChild>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/40 border border-border text-xs cursor-help">
                          <Cpu className="w-3.5 h-3.5 text-primary" />
                          <span className="text-muted-foreground">Core:</span>
                          <span className="font-mono font-bold text-foreground">{metrics.totalCores}</span>
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-56 text-xs space-y-1">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-primary" />
                          <span>CPU Core Quota</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {metrics.totalCores} total cores allocated for apps and add-ons.
                        </div>
                      </HoverCardContent>
                    </HoverCard>

                    {/* Memory */}
                    <HoverCard openDelay={150}>
                      <HoverCardTrigger asChild>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/40 border border-border text-xs cursor-help">
                          <Activity className="w-3.5 h-3.5 text-primary" />
                          <span className="text-muted-foreground">RAM:</span>
                          <span className="font-mono font-bold text-foreground">{metrics.formattedMemory}</span>
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-56 text-xs space-y-1">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-primary" />
                          <span>RAM Limit</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {metrics.formattedMemory} total RAM allocated with cgroups limits.
                        </div>
                      </HoverCardContent>
                    </HoverCard>

                    {/* Disk */}
                    <HoverCard openDelay={150}>
                      <HoverCardTrigger asChild>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/40 border border-border text-xs cursor-help">
                          <HardDrive className="w-3.5 h-3.5 text-primary" />
                          <span className="text-muted-foreground">Disk:</span>
                          <span className="font-mono font-bold text-foreground">{metrics.formattedDisk}</span>
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-56 text-xs space-y-1">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <HardDrive className="w-3.5 h-3.5 text-primary" />
                          <span>Storage Capacity</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {metrics.formattedDisk} total persistent storage for volumes.
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </div>

                  {/* Right: Services Count & Link Arrow */}
                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 text-xs text-muted-foreground pt-2 md:pt-0 border-t md:border-t-0 border-border/60">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <Server className="w-3.5 h-3.5" />
                        <span>{project.applications.length}</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Database className="w-3.5 h-3.5" />
                        <span>{project.addons.length}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] opacity-75 hidden sm:inline">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors">
                        <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
