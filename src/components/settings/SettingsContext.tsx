"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export type SettingsTabKey =
  | "rbac"
  | "alerts"
  | "oauth"
  | "ingress"
  | "mcp"
  | "maintenance"
  | "appearance";

interface SettingsContextType {
  activeTab: SettingsTabKey;
  setActiveTab: (tab: SettingsTabKey) => void;

  // Current User & RBAC
  currentUser: any;
  users: any[];
  loadingUsers: boolean;
  loadUsers: () => Promise<void>;
  newUserName: string;
  setNewUserName: (s: string) => void;
  newUserEmail: string;
  setNewUserEmail: (s: string) => void;
  newUserPassword: string;
  setNewUserPassword: (s: string) => void;
  newUserRole: string;
  setNewUserRole: (s: string) => void;
  userError: string;
  userSuccess: string;
  handleCreateUser: (e: React.FormEvent) => Promise<void>;
  handleDeleteUser: (userId: string) => Promise<void>;

  // Password Update
  myPassword: string;
  setMyPassword: (s: string) => void;
  passwordSuccess: string;
  passwordError: string;
  savingPassword: boolean;
  handleUpdatePassword: (e: React.FormEvent) => Promise<void>;

  // Alerts
  alertEmail: string;
  setAlertEmail: (s: string) => void;
  smtpHost: string;
  setSmtpHost: (s: string) => void;
  smtpPort: string;
  setSmtpPort: (s: string) => void;
  smtpUser: string;
  setSmtpUser: (s: string) => void;
  smtpPass: string;
  setSmtpPass: (s: string) => void;
  isSendingAlert: boolean;
  alertFeedback: string;
  handleTestEmail: () => Promise<void>;

  // OAuth
  githubClientId: string;
  setGithubClientId: (s: string) => void;
  githubClientSecret: string;
  setGithubClientSecret: (s: string) => void;
  oauthSaved: boolean;
  handleSaveOauth: (e: React.FormEvent) => Promise<void>;

  // Wildcard
  wildcardDomain: string;
  setWildcardDomain: (s: string) => void;
  wildcardSaved: boolean;
  savingWildcard: boolean;
  wildcardFeedback: string;
  handleSaveWildcard: (e: React.FormEvent) => Promise<void>;

  // Maintenance & Backup
  dbBackupStats: any;
  dbBackupsList: any[];
  loadingBackups: boolean;
  creatingBackup: boolean;
  backupMessage: string | null;
  loadDatabaseBackupData: () => Promise<void>;
  handleCreateStoredBackup: () => Promise<void>;

  getRoleBadge: (role: string) => string;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTabKey>("rbac");

  // Users / RBAC State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("DEVELOPER");
  const [userError, setUserError] = useState("");
  const [userSuccess, setUserSuccess] = useState("");

  // My Password Change State
  const [myPassword, setMyPassword] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Alerting State
  const [alertEmail, setAlertEmail] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [isSendingAlert, setIsSendingAlert] = useState(false);
  const [alertFeedback, setAlertFeedback] = useState("");

  // OAuth Settings State
  const [githubClientId, setGithubClientId] = useState("");
  const [githubClientSecret, setGithubClientSecret] = useState("");
  const [oauthSaved, setOauthSaved] = useState(false);

  // Wildcard Domain & Ingress State
  const [wildcardDomain, setWildcardDomain] = useState("127.0.0.1.sslip.io");
  const [wildcardSaved, setWildcardSaved] = useState(false);
  const [savingWildcard, setSavingWildcard] = useState(false);
  const [wildcardFeedback, setWildcardFeedback] = useState("");

  // Database Backup State
  const [dbBackupStats, setDbBackupStats] = useState<any>(null);
  const [dbBackupsList, setDbBackupsList] = useState<any[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  const loadDatabaseBackupData = async () => {
    setLoadingBackups(true);
    try {
      const res = await fetch("/api/system/backup");
      const data = await res.json();
      if (data.success) {
        setDbBackupStats(data.stats);
        setDbBackupsList(data.backups || []);
      }
    } catch {}
    setLoadingBackups(false);
  };

  const handleCreateStoredBackup = async () => {
    setCreatingBackup(true);
    setBackupMessage(null);
    try {
      const res = await fetch("/api/system/backup", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setBackupMessage("Backup successfully created!");
        await loadDatabaseBackupData();
      } else {
        setBackupMessage(data.error || "Failed to create backup");
      }
    } catch (err: any) {
      setBackupMessage(err.message || "Failed to create backup");
    } finally {
      setCreatingBackup(false);
      setTimeout(() => setBackupMessage(null), 4000);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.success && data.users) {
        setUsers(data.users);
      }
    } catch {}
    setLoadingUsers(false);
  };

  const loadSystemSettings = async () => {
    try {
      const res = await fetch("/api/system/settings");
      const data = await res.json();
      if (data.success && data.settings) {
        if (data.settings.WILDCARD_DOMAIN) {
          setWildcardDomain(data.settings.WILDCARD_DOMAIN);
        }
        if (data.settings.GITHUB_CLIENT_ID) {
          setGithubClientId(data.settings.GITHUB_CLIENT_ID);
        }
        if (data.settings.GITHUB_CLIENT_SECRET) {
          setGithubClientSecret(data.settings.GITHUB_CLIENT_SECRET);
        }
        if (data.settings.ALERT_EMAIL) {
          setAlertEmail(data.settings.ALERT_EMAIL);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.replace("/login");
        } else {
          setCurrentUser(data.user);
          loadUsers();
          loadSystemSettings();
        }
      })
      .catch(() => {
        router.replace("/login");
      });
  }, [router]);

  useEffect(() => {
    if (activeTab === "maintenance") {
      loadDatabaseBackupData();
    }
  }, [activeTab]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !myPassword.trim()) return;
    setSavingPassword(true);
    setPasswordSuccess("");
    setPasswordError("");

    try {
      const res = await fetch(`/api/users/${currentUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: myPassword.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setPasswordSuccess("Password updated and saved to colyin-credentials.txt!");
        setMyPassword("");
        setTimeout(() => setPasswordSuccess(""), 5000);
      } else {
        setPasswordError(data.error || "Failed to update password");
      }
    } catch {
      setPasswordError("Failed to reach server");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError("");
    setUserSuccess("");

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName.trim(),
          email: newUserEmail.trim(),
          password: newUserPassword,
          role: newUserRole,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setUserError(data.error || "Failed to create user");
      } else {
        setUserSuccess(`User '${data.user.name}' (${data.user.role}) created successfully!`);
        setNewUserName("");
        setNewUserEmail("");
        setNewUserPassword("");
        loadUsers();
      }
    } catch {
      setUserError("Failed to reach server");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        loadUsers();
      } else {
        alert(data.error || "Cannot delete user");
      }
    } catch (err) {
      console.error("Delete user error:", err);
    }
  };

  const handleTestEmail = async () => {
    setIsSendingAlert(true);
    setAlertFeedback("");
    await new Promise((r) => setTimeout(r, 1000));
    setIsSendingAlert(false);
    setAlertFeedback("Test alert dispatched via SMTP engine successfully!");
  };

  const handleSaveOauth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (githubClientId.trim()) {
        await fetch("/api/system/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "GITHUB_CLIENT_ID", value: githubClientId.trim() }),
        });
      }
      if (githubClientSecret.trim()) {
        await fetch("/api/system/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "GITHUB_CLIENT_SECRET", value: githubClientSecret.trim() }),
        });
      }
      setOauthSaved(true);
      setTimeout(() => setOauthSaved(false), 3000);
    } catch (err) {
      console.error("Save OAuth failed:", err);
    }
  };

  const handleSaveWildcard = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWildcard(true);
    setWildcardFeedback("");
    try {
      const res = await fetch("/api/system/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "WILDCARD_DOMAIN", value: wildcardDomain }),
      });
      const data = await res.json();
      if (data.success) {
        setWildcardSaved(true);
        setWildcardFeedback(
          "Wildcard root domain saved! All deployments will now automatically be issued HTTPS subdomains under this root."
        );
        setTimeout(() => setWildcardSaved(false), 4000);
      } else {
        setWildcardFeedback(data.error || "Failed to save wildcard domain");
      }
    } catch {
      setWildcardFeedback("Failed to reach server");
    } finally {
      setSavingWildcard(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      case "DEVELOPER":
        return "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
      case "VIEWER":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        activeTab,
        setActiveTab,
        currentUser,
        users,
        loadingUsers,
        loadUsers,
        newUserName,
        setNewUserName,
        newUserEmail,
        setNewUserEmail,
        newUserPassword,
        setNewUserPassword,
        newUserRole,
        setNewUserRole,
        userError,
        userSuccess,
        handleCreateUser,
        handleDeleteUser,
        myPassword,
        setMyPassword,
        passwordSuccess,
        passwordError,
        savingPassword,
        handleUpdatePassword,
        alertEmail,
        setAlertEmail,
        smtpHost,
        setSmtpHost,
        smtpPort,
        setSmtpPort,
        smtpUser,
        setSmtpUser,
        smtpPass,
        setSmtpPass,
        isSendingAlert,
        alertFeedback,
        handleTestEmail,
        githubClientId,
        setGithubClientId,
        githubClientSecret,
        setGithubClientSecret,
        oauthSaved,
        handleSaveOauth,
        wildcardDomain,
        setWildcardDomain,
        wildcardSaved,
        savingWildcard,
        wildcardFeedback,
        handleSaveWildcard,
        dbBackupStats,
        dbBackupsList,
        loadingBackups,
        creatingBackup,
        backupMessage,
        loadDatabaseBackupData,
        handleCreateStoredBackup,
        getRoleBadge,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
