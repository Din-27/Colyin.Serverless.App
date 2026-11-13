"use client";

import React from "react";
import { Check } from "lucide-react";
import {
  ServiceWizardProvider,
  useServiceWizard,
} from "./service-wizard/ServiceWizardContext";
import { WizardStep1Source } from "./service-wizard/WizardStep1Source";
import { WizardStep2Addons } from "./service-wizard/WizardStep2Addons";
import { WizardStep3Deploy } from "./service-wizard/WizardStep3Deploy";
import { GithubOauthModal } from "./service-wizard/GithubOauthModal";

function WizardContent() {
  const { step, error } = useServiceWizard();

  const steps = [
    { num: 1, label: "Repository Source" },
    { num: 2, label: "Attach Resources" },
    { num: 3, label: "Environment & Deploy" },
  ];

  return (
    <div className="space-y-6">
      {/* Step Indicators */}
      <div className="flex items-center justify-between pb-4 border-b border-border text-xs">
        {steps.map((s) => (
          <div
            key={s.num}
            className={`flex items-center gap-2 ${
              step === s.num
                ? "text-indigo-600 dark:text-indigo-400 font-semibold"
                : step > s.num
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground/60"
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${
                step === s.num
                  ? "border-indigo-500 bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                  : step > s.num
                  ? "border-emerald-500 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "border-border bg-muted/50 text-muted-foreground/60"
              }`}
            >
              {step > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {step === 1 && <WizardStep1Source />}
      {step === 2 && <WizardStep2Addons />}
      {step === 3 && <WizardStep3Deploy />}

      <GithubOauthModal />
    </div>
  );
}

export function ServiceWizardForm({ project }: { project: any }) {
  return (
    <ServiceWizardProvider project={project}>
      <WizardContent />
    </ServiceWizardProvider>
  );
}
