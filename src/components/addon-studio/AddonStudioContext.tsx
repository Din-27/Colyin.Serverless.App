"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface AddonStudioContextType {
  addonId: string;
  data: any;
  loading: boolean;
  toggling: boolean;
  showPassword: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  setShowPassword: (show: boolean) => void;
  fetchCredentials: () => Promise<void>;
  handleTogglePublic: () => Promise<void>;
  handleUpdateSettings: (payload: {
    name?: string;
    publicPort?: number | null;
    password?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  handleDeleteAddon: () => Promise<{ success: boolean; error?: string }>;
  handleRestartAddon: () => Promise<{ success: boolean; error?: string }>;
}

const AddonStudioContext = createContext<AddonStudioContextType | null>(null);

export function useAddonStudio() {
  const context = useContext(AddonStudioContext);
  if (!context) {
    throw new Error("useAddonStudio must be used within an AddonStudioProvider");
  }
  return context;
}

export function AddonStudioProvider({
  addonId,
  children,
}: {
  addonId: string;
  children: React.ReactNode;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("credentials");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam && ["credentials", "studio", "settings"].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  const fetchCredentials = async () => {
    try {
      const res = await fetch(`/api/addons/${addonId}/credentials`);
      const json = await res.json();
      if (json.success) {
        setData(json.addon);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchCredentials();
  }, [addonId]);

  const handleTogglePublic = async () => {
    setToggling(true);
    try {
      await fetch(`/api/addons/${addonId}/toggle-public`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enable: !data?.isPublic }),
      });
      await fetchCredentials();
    } catch (err) {
      console.error(err);
    } finally {
      setToggling(false);
    }
  };

  const handleUpdateSettings = async (payload: {
    name?: string;
    publicPort?: number | null;
    password?: string;
  }) => {
    try {
      const res = await fetch(`/api/addons/${addonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        await fetchCredentials();
        return { success: true };
      }
      return { success: false, error: json.error || "Failed to update settings" };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const handleRestartAddon = async () => {
    try {
      const res = await fetch(`/api/addons/${addonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restart" }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchCredentials();
        return { success: true };
      }
      return { success: false, error: json.error || "Failed to restart" };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const handleDeleteAddon = async () => {
    try {
      const res = await fetch(`/api/addons/${addonId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        return { success: true };
      }
      return { success: false, error: json.error || "Failed to delete" };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  return (
    <AddonStudioContext.Provider
      value={{
        addonId,
        data,
        loading,
        toggling,
        showPassword,
        activeTab,
        setActiveTab,
        setShowPassword,
        fetchCredentials,
        handleTogglePublic,
        handleUpdateSettings,
        handleDeleteAddon,
        handleRestartAddon,
      }}
    >
      {children}
    </AddonStudioContext.Provider>
  );
}

