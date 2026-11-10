"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Server, Layers, Settings, LogOut, LogIn, Shield, User, BookOpen } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ColyinLogo } from "@/components/ColyinLogo";

export function Navbar() {
  const [online, setOnline] = useState<boolean | null>(null);
  const [user, setUser] = useState<{ id: string; email: string; name: string; role: string } | null>(null);
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-rose-950/80 text-rose-300 border-rose-800/80";
      case "DEVELOPER":
        return "bg-indigo-950/80 text-indigo-300 border-indigo-800/80";
      case "VIEWER":
        return "bg-emerald-950/80 text-emerald-300 border-emerald-800/80";
      default:
        return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  };

  // Hide the navbar entirely on the sign-in / login screen
  if (pathname === "/login") {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <ColyinLogo size={36} showText={true} />
          </Link>

          {/* Navigation links: Projects & Settings for logged in user */}
          {user && (
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/"
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-md transition"
              >
                <Layers className="w-4 h-4 text-zinc-400" />
                Projects
              </Link>
              <Link
                href="/settings"
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-md transition"
              >
                <Settings className="w-4 h-4 text-zinc-400" />
                Settings
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Docker engine pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                online === null
                  ? "bg-zinc-500"
                  : online
                  ? "bg-emerald-400 animate-pulse"
                  : "bg-amber-400"
              }`}
            />
            <span className="text-zinc-300 font-medium">
              {online === null
                ? "Connecting..."
                : online
                ? "Docker Online"
                : "Local Standalone"}
            </span>
          </div>

          {/* Theme Switcher Toggle */}
          <ThemeToggle />

          {/* User Profile & RBAC Badge */}
          {user ? (
            <div className="flex items-center gap-3 pl-2 border-l border-zinc-800">
              <div className="text-right hidden md:block">
                <div className="text-xs font-semibold text-white leading-tight">{user.name}</div>
                <div className="text-[10px] text-zinc-400 font-mono leading-tight">{user.email}</div>
              </div>

              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-md border font-bold ${getRoleBadgeColor(
                  user.role
                )}`}
              >
                {user.role}
              </span>

              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
