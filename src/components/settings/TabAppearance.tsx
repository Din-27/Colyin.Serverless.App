"use client";

import React from "react";
import { Palette, Sun, Moon } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export function TabAppearance() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-xs p-6 space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Palette className="w-4 h-4 text-indigo-500" />
          Interface Theme &amp; Styling
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Select your preferred color theme or synchronize automatically with your operating system.
        </p>
      </div>

      <div className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-sm font-semibold text-foreground block">Theme Mode</span>
            <span className="text-xs text-muted-foreground mt-0.5 block">
              Choose between Light, Dark, or System mode. Changes apply immediately across all console pages.
            </span>
          </div>

          <ThemeToggle variant="segmented" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div className="p-4 rounded-xl border border-border bg-muted/40 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Sun className="w-4 h-4 text-amber-500" />
            <span>Light Theme</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Clean, high-contrast slate &amp; white palette optimized for daytime environments, well-lit spaces, and high readability.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-muted/40 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Moon className="w-4 h-4 text-indigo-500" />
            <span>Dark Theme</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Deep zinc &amp; obsidian dark palette with subtle neon borders, reducing eye fatigue during late-night development.
          </p>
        </div>
      </div>
    </div>
  );
}

