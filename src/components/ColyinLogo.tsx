"use client";

import React from "react";

interface ColyinLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textClassName?: string;
  animated?: boolean;
}

export function ColyinLogo({
  className = "",
  size = 40,
  showText = false,
  textClassName = "",
  animated = true,
}: ColyinLogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* 3D Cyber-Crystal Logo */}
      <div
        className={`relative shrink-0 flex items-center justify-center transition-all duration-300 ${
          animated ? "hover:scale-105" : ""
        }`}
        style={{ width: size, height: size }}
      >
        {/* Ambient Glow */}
        <div
          className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[#00F0FF]/25 via-[#8B5CF6]/20 to-[#0284C7]/20 blur-md -z-10"
        />
        <img
          src="/logo.png"
          alt="Colyin Logo"
          width={size}
          height={size}
          className="w-full h-full object-contain filter drop-shadow-[0_0_14px_rgba(0,240,255,0.4)]"
        />
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex items-center gap-2 text-left">
          <span
            className={`font-black tracking-tight text-white leading-none ${
              textClassName || "text-lg"
            }`}
          >
            Colyin
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30 tracking-wider shadow-[0_0_10px_rgba(0,240,255,0.25)]">
            CORE
          </span>
        </div>
      )}
    </div>
  );
}

export default ColyinLogo;
