"use client";

import { useState, useEffect } from "react";
import { RUNTIME_GROUPS, isKnownRuntimePreset } from "@/lib/runtimes";
import { Cpu, Sparkles, Terminal } from "lucide-react";

interface RuntimeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  helperText?: string;
}

export function RuntimeSelector({
  value,
  onChange,
  label = "Compiler / Runtime Version",
  helperText = "Dynamic multi-stage buildpacks will run your build with the chosen compiler/runtime version.",
}: RuntimeSelectorProps) {
  const isKnown = isKnownRuntimePreset(value);
  const [selectedOption, setSelectedOption] = useState<string>(
    isKnown ? value || "AUTO" : "CUSTOM"
  );
  const [customInput, setCustomInput] = useState<string>(isKnown ? "" : value || "");

  useEffect(() => {
    if (isKnownRuntimePreset(value)) {
      setSelectedOption(value || "AUTO");
    } else {
      setSelectedOption("CUSTOM");
      setCustomInput(value || "");
    }
  }, [value]);

  const handleSelectChange = (newVal: string) => {
    setSelectedOption(newVal);
    if (newVal === "CUSTOM") {
      onChange(customInput.trim() || "AUTO");
    } else {
      onChange(newVal);
    }
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setCustomInput(text);
    onChange(text.trim() || "AUTO");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-indigo-500" />
          <span>{label}</span>
        </label>
        {selectedOption === "AUTO" && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/80 px-2 py-0.5 rounded-full">
            <Sparkles className="w-2.5 h-2.5" />
            Auto-inspection enabled
          </span>
        )}
      </div>

      <select
        value={selectedOption}
        onChange={(e) => handleSelectChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-background border border-input text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring font-medium"
      >
        {RUNTIME_GROUPS.map((group) => (
          <optgroup key={group.group} label={group.group} className="bg-popover text-popover-foreground font-semibold">
            {group.options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-popover text-popover-foreground font-normal py-1">
                {opt.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {selectedOption === "CUSTOM" && (
        <div className="pt-1 space-y-1">
          <div className="relative">
            <Terminal className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="e.g. 22.11.0, 3.12-slim, 1.23.2, 8.0-alpine"
              value={customInput}
              onChange={handleCustomInputChange}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-background border border-input text-foreground font-mono text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Specify the exact version or Docker base image tag to use during compilation and runtime.
          </p>
        </div>
      )}

      {selectedOption === "AUTO" ? (
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {helperText} We automatically read configuration files like <code className="text-indigo-600 dark:text-indigo-400 font-semibold">.nvmrc</code>, <code className="text-indigo-600 dark:text-indigo-400 font-semibold">go.mod</code>, <code className="text-indigo-600 dark:text-indigo-400 font-semibold">pom.xml</code>, <code className="text-indigo-600 dark:text-indigo-400 font-semibold">runtime.txt</code>, and <code className="text-indigo-600 dark:text-indigo-400 font-semibold">Cargo.toml</code> from your repository.
        </p>
      ) : selectedOption !== "CUSTOM" ? (
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Override active: Build and runtime containers will explicitly use version <code className="text-indigo-600 dark:text-indigo-400 font-mono font-semibold">{selectedOption}</code>.
        </p>
      ) : null}
    </div>
  );
}
