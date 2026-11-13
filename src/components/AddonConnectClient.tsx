"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import {
  AddonStudioProvider,
  useAddonStudio,
} from "./addon-studio/AddonStudioContext";
import { AddonConnectionCard } from "./addon-studio/AddonConnectionCard";
import { WebSqlStudio } from "./addon-studio/WebSqlStudio";
import { WebRedisStudio } from "./addon-studio/WebRedisStudio";

function AddonStudioContent() {
  const { data, loading } = useAddonStudio();

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
        Decrypting connection credentials...
      </div>
    );
  }

  if (!data) {
    return <div className="text-xs text-rose-400">Failed to load credentials.</div>;
  }

  return (
    <div className="space-y-6">
      <AddonConnectionCard />
      <WebSqlStudio />
      <WebRedisStudio />
    </div>
  );
}

export function AddonConnectClient({ addonId }: { addonId: string }) {
  return (
    <AddonStudioProvider addonId={addonId}>
      <AddonStudioContent />
    </AddonStudioProvider>
  );
}
