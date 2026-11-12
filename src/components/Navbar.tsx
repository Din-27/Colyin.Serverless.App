"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Layers,
  Activity,
  LogOut,
  User,
  Shield,
  Server,
  Radio,
  FolderKanban,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ColyinLogo } from "@/components/ColyinLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [user, setUser] = useState<{
    id: string;
    email: string;
    name: string;
    role: string;
  } | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check docker status
    fetch("/api/system/status")
      .then((res) => res.json())
      .then((data) => {
        setOnline(!!data?.status?.online);
      })
      .catch(() => setOnline(false));

    // Check user auth session
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null));
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Hide the navbar entirely on login screen
  if (pathname === "/login") {
    return null;
  }

  const navItems = [
    { href: "/", label: "Projects", icon: FolderKanban, exact: true },
    { href: "/overview", label: "Overview", icon: Activity, exact: false },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/80 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between">
        {/* Left: Brand & Navigation */}
        <div className="flex items-center gap-6 md:gap-8">
          <Link href="/" className="group flex items-center transition-opacity hover:opacity-90">
            <ColyinLogo size={32} showText={true} />
          </Link>

          {user && (
            <nav className="flex items-center gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150",
                      isActive
                        ? "bg-secondary text-foreground font-semibold shadow-xs border border-border/60"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                    )}
                  >
                    <Icon className={cn("w-3.5 h-3.5", isActive ? "text-foreground" : "text-muted-foreground")} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right: Engine Status, Theme Toggle & User Info */}
        <div className="flex items-center gap-3">
          {/* Docker Engine Status Indicator */}
          <div
            className={cn(
              "hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-mono font-medium border transition-colors",
              online === true
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30"
                : online === false
                ? "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400 dark:border-rose-500/30"
                : "bg-secondary text-muted-foreground border-border"
            )}
            title={online ? "Docker Engine is connected & healthy" : "Docker Engine unreachable"}
          >
            <span className="relative flex h-2 w-2">
              {online && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={cn(
                  "relative inline-flex rounded-full h-2 w-2",
                  online === true ? "bg-emerald-500" : online === false ? "bg-rose-500" : "bg-muted-foreground"
                )}
              />
            </span>
            <span>{online ? "Engine Ready" : online === false ? "Engine Offline" : "Checking..."}</span>
          </div>

          <ThemeToggle />

          {/* User Account & Logout */}
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-border/70">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-medium text-foreground leading-none">
                  {user.name || user.email}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                  {user.role?.toLowerCase()}
                </span>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                title="Sign out of Colyin"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
