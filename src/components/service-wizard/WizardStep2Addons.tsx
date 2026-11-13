"use client";

import React from "react";
import { useServiceWizard } from "./ServiceWizardContext";
import { ArrowLeft, ArrowRight } from "lucide-react";

export function WizardStep2Addons() {
  const { project, selectedAddonId, setSelectedAddonId, setStep } = useServiceWizard();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground">Attach Project Addons</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Select existing database or queue addons in project '{project.name}' to auto-inject connection credentials.
        </p>
      </div>

      <div className="space-y-3">
        <label
          onClick={() => setSelectedAddonId("")}
          className={`flex items-center justify-between p-3.5 rounded-lg border cursor-pointer transition ${
            selectedAddonId === ""
              ? "bg-indigo-500/10 border-indigo-500 text-foreground"
              : "bg-card border-border text-muted-foreground hover:bg-accent/50"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full border border-border flex items-center justify-center">
              {selectedAddonId === "" && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
            </div>
            <div>
              <div className="text-xs font-semibold text-foreground">Standalone Service (No Addons)</div>
              <div className="text-[11px] text-muted-foreground">Do not bind any internal project database</div>
            </div>
          </div>
        </label>

        {project.addons.map((addon: any) => (
          <label
            key={addon.id}
            onClick={() => setSelectedAddonId(addon.id)}
            className={`flex items-center justify-between p-3.5 rounded-lg border cursor-pointer transition ${
              selectedAddonId === addon.id
                ? "bg-indigo-500/10 border-indigo-500 text-foreground"
                : "bg-card border-border text-foreground hover:bg-accent/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full border border-border flex items-center justify-center">
                {selectedAddonId === addon.id && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
              </div>
              <div>
                <div className="text-xs font-semibold flex items-center gap-2">
                  <span className="text-foreground">{addon.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-indigo-500">
                    {addon.type}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                  Host: {addon.internalHost}:{addon.internalPort}
                </div>
              </div>
            </div>
          </label>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold cursor-pointer transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <button
          type="button"
          onClick={() => setStep(3)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer transition"
        >
          <span>Continue to Environment</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

