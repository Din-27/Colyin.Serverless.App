"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface AddonStudioContextType {
  addonId: string;
  data: any;
  loading: boolean;
  toggling: boolean;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  fetchCredentials: () => Promise<void>;
  handleTogglePublic: () => Promise<void>;
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

  return (
    <AddonStudioContext.Provider
      value={{
        addonId,
        data,
        loading,
        toggling,
        showPassword,
        setShowPassword,
        fetchCredentials,
        handleTogglePublic,
      }}
    >
      {children}
    </AddonStudioContext.Provider>
  );
}
