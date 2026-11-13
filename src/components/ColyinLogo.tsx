"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ColyinLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textClassName?: string;
  animated?: boolean;
}

export function ColyinLogo({
  className = "",
  size = 32,
  showText = false,
  textClassName = "",
  animated = true,
}: ColyinLogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      {/* Minimalist Vector Mark */}
      <div
        className={cn(
          "relative shrink-0 flex items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs border border-border transition-all duration-300",
          animated && "hover:scale-105 active:scale-95"
        )}
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5 transition-transform duration-300 group-hover:rotate-6"
        >
          {/* Modern Geometric Serverless Cube / Layer */}
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex items-center gap-2 text-left">
          <span
            className={cn(
              "font-bold tracking-tight text-foreground text-base leading-none",
              textClassName
            )}
          >
            Colyin
          </span>
          <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border">
            PaaS
          </span>
        </div>
      )}
    </div>
  );
}

export default ColyinLogo;
