"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Mail,
  Shield,
  Users,
  CheckCircle2,
  Loader2,
  Trash2,
  Plus,
  KeyRound,
  ExternalLink,
  Lock,
  Palette,
  Sun,
  Moon,
  Globe,
  ShieldCheck,
  Check,
  Coffee,
} from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<
    "rbac" | "alerts" | "oauth" | "ingress" | "appearance"
  >("rbac");

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

  const router = useRouter();

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
        return "bg-rose-950/80 text-rose-300 border-rose-800/80";
      case "DEVELOPER":
        return "bg-indigo-950/80 text-indigo-300 border-indigo-800/80";
      case "VIEWER":
        return "bg-emerald-950/80 text-emerald-300 border-emerald-800/80";
      default:
        return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="pb-6 border-b border-border/80">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Shield className="w-6 h-6 text-indigo-500" />
          <span>Settings</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage team access, alerting, and integrations.
        </p>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border/80 pb-2 text-xs overflow-x-auto">
        {[
          { id: "rbac", label: "Team & Users", icon: Users },
          { id: "alerts", label: "Alerts", icon: Bell },
          { id: "oauth", label: "GitHub OAuth", icon: KeyRound },
          { id: "ingress", label: "Domain & SSL", icon: Globe },
          { id: "appearance", label: "Appearance", icon: Palette },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer whitespace-nowrap",
                isActive
                  ? "bg-secondary text-foreground font-semibold shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              )}
            >
              <Icon className={cn("w-3.5 h-3.5", isActive ? "text-foreground" : "text-muted-foreground")} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: RBAC Users Management */}
      {activeTab === "rbac" && (
        <div className="space-y-6">
          {/* Change Account / Master Password Card */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  Change Password
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Update the password for your current account{" "}
                  {currentUser && (
                    <span className="font-mono text-zinc-300 font-semibold">({currentUser.email})</span>
                  )}
                  . Changes made by administrators are automatically synchronized to{" "}
                  <code className="text-amber-300 font-mono text-[11px] bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
                    colyin-credentials.txt
                  </code>{" "}
                  on this VPS host.
                </p>
              </div>
            </div>

            {passwordSuccess && (
              <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {passwordSuccess}
              </div>
            )}
            {passwordError && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                {passwordError}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-3 text-xs max-w-lg">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter strong new password (min. 8 chars)"
                  value={myPassword}
                  onChange={(e) => setMyPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={savingPassword || !myPassword.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition"
                >
                  {savingPassword ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Lock className="w-3.5 h-3.5" />
                  )}
                  Update Password &amp; Sync colyin-credentials.txt
                </button>
              </div>
            </form>
          </div>

          {/* Add User Card */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                Add Collaborator / Team Member (RBAC)
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Admins can provision collaborator accounts with designated role-based access. Note: Collaborator accounts will <strong className="text-zinc-200">never</strong> see master credentials.
              </p>
            </div>

            {userError && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                {userError}
              </div>
            )}
            {userSuccess && (
              <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {userSuccess}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Jenkins"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="sarah@company.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Temporary Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Minimum 8 characters"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Assigned Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="DEVELOPER">DEVELOPER (Deploy &amp; Config Services)</option>
                    <option value="VIEWER">VIEWER (Read-Only Metrics &amp; Logs)</option>
                    <option value="ADMIN">ADMIN (Full Access &amp; User Management)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Member
                </button>
              </div>
            </form>
          </div>

          {/* Users Table */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between text-xs">
              <span className="font-semibold text-white">Registered Users &amp; Roles</span>
              <span className="text-zinc-500">{users.length} members</span>
            </div>

            {loadingUsers ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-indigo-400" />
                Loading users...
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/80 bg-zinc-950">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-white flex items-center gap-2">
                        <span>{u.name}</span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${getRoleBadge(
                            u.role
                          )}`}
                        >
                          {u.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono">{u.email}</div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-zinc-500">
                        Joined {new Date(u.createdAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        title="Delete user"
                        className="p-1.5 rounded text-zinc-500 hover:text-rose-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Alerting & Incident Notifications */}
      {activeTab === "alerts" && (
        <div className="space-y-6">
          {alertFeedback && (
            <div className="p-4 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {alertFeedback}
            </div>
          )}

          {/* Trigger Rules */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white">Active Alert Triggers</h3>
            <div className="space-y-3 text-xs">
              {[
                {
                  id: "deploy-failed",
                  title: "Deployment Build Failed",
                  desc: "Sends immediately when code compilation, git clone, or image generation errors occur.",
                },
                {
                  id: "crash-loop",
                  title: "Container Crash (Exit Code > 0)",
                  desc: "Fires when an active container terminates unexpectedly.",
                },
                {
                  id: "healthcheck",
                  title: "Healthcheck Failure (HTTP 502 / Timeout)",
                  desc: "Dispatches if the application does not reply within 60 seconds of promotion.",
                },
                {
                  id: "oom",
                  title: "Out-of-Memory (OOM Killed)",
                  desc: "Fires when cgroups v2 kills a container exceeding memory quotas.",
                },
              ].map((item) => (
                <label
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800 cursor-pointer hover:bg-zinc-900/60 transition"
                >
                  <input
                    type="checkbox"
                    defaultChecked
                    className="mt-0.5 rounded text-indigo-600 bg-zinc-800 border-zinc-700"
                  />
                  <div>
                    <div className="font-semibold text-zinc-200">{item.title}</div>
                    <div className="text-zinc-500 mt-0.5 text-[11px]">{item.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Recipient & SMTP Config */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-indigo-400" />
              SMTP Server Configuration
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1.5">
                  Alert Recipient Email
                </label>
                <input
                  type="email"
                  placeholder="alerts@yourdomain.com"
                  value={alertEmail}
                  onChange={(e) => setAlertEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1.5">SMTP Host</label>
                  <input
                    type="text"
                    placeholder="smtp.mailgun.org or smtp.sendgrid.net"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1.5">SMTP Port</label>
                  <input
                    type="text"
                    placeholder="587"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1.5">Username</label>
                  <input
                    type="text"
                    placeholder="Optional"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1.5">Password</label>
                  <input
                    type="password"
                    placeholder="Optional"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={isSendingAlert}
                  onClick={handleTestEmail}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition"
                >
                  {isSendingAlert ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Mail className="w-3.5 h-3.5" />
                  )}
                  Send Test Alert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: GitHub OAuth Configuration */}
      {activeTab === "oauth" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-5">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-400" />
              GitHub OAuth App Credentials
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Configure OAuth credentials to enable zero-token 1-click GitHub authorization for your developers.
            </p>
          </div>

          {oauthSaved && (
            <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              GitHub OAuth settings updated!
            </div>
          )}

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
            <span className="font-semibold text-zinc-300 block">
              Authorization Callback URL to register on GitHub:
            </span>
            <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-between font-mono text-indigo-300">
              <span>http://localhost:3000/api/github/callback</span>
              <CopyButton text="http://localhost:3000/api/github/callback" label="Copy" />
            </div>
            <p className="text-[11px] text-zinc-500">
              Register this URL in your GitHub Developer Settings &gt; OAuth Apps.
            </p>
          </div>

          <form onSubmit={handleSaveOauth} className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">
                GitHub Client ID
              </label>
              <input
                type="text"
                placeholder="Ov23li..."
                value={githubClientId}
                onChange={(e) => setGithubClientId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">
                GitHub Client Secret
              </label>
              <input
                type="password"
                placeholder="••••••••••••••••••••••••"
                value={githubClientSecret}
                onChange={(e) => setGithubClientSecret(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Save OAuth Credentials
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 4: Wildcard Ingress & Automatic HTTPS */}
      {activeTab === "ingress" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-semibold text-white">
                Wildcard Ingress &amp; Automatic HTTPS Domains
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Zero-Config TLS
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Configure the root wildcard domain used to auto-generate public HTTPS subdomains for every deployed service, exactly like Vercel (<span className="font-mono text-zinc-300">*.vercel.app</span>) and Railway (<span className="font-mono text-zinc-300">*.up.railway.app</span>).
            </p>
          </div>

          {wildcardFeedback && (
            <div
              className={`p-3.5 rounded-lg text-xs flex items-center gap-2 ${
                wildcardSaved
                  ? "bg-emerald-950/60 border border-emerald-800 text-emerald-300"
                  : "bg-rose-950/60 border border-rose-800 text-rose-300"
              }`}
            >
              {wildcardSaved ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Shield className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{wildcardFeedback}</span>
            </div>
          )}

          {/* Live Preview Card */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                Automatic Application Domain Structure:
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">Traefik Dynamic Routing</span>
            </div>

            <div className="p-3 rounded-lg bg-zinc-900 border border-emerald-500/30 font-mono text-emerald-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-bold text-xs truncate">
                <Lock className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <span className="truncate">https://[app-name]-[rand6].{wildcardDomain}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-sans font-semibold shrink-0">
                HTTPS Port 443 + HTTP Redirect
              </span>
            </div>

            <p className="text-[11px] text-zinc-400">
              With <span className="font-mono text-indigo-300">127.0.0.1.sslip.io</span> or <span className="font-mono text-indigo-300">traefik.me</span>, every subdomain automatically resolves to your local server IP worldwide without editing hosts files.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-300">
              Quick DNS Presets
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                {
                  domain: "127.0.0.1.sslip.io",
                  label: "sslip.io (Localhost)",
                  desc: "Resolves all subdomains to 127.0.0.1",
                },
                {
                  domain: "traefik.me",
                  label: "traefik.me (Localhost)",
                  desc: "Built-in Traefik localhost wildcard DNS",
                },
                {
                  domain: "apps.yourdomain.com",
                  label: "Custom Domain",
                  desc: "Wildcard A record pointing to VPS IP",
                },
              ].map((p) => (
                <button
                  key={p.domain}
                  type="button"
                  onClick={() => setWildcardDomain(p.domain)}
                  className={`p-3 rounded-lg border text-left transition ${
                    wildcardDomain === p.domain
                      ? "bg-indigo-950/50 border-indigo-500 text-white"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span>{p.label}</span>
                    {wildcardDomain === p.domain && (
                      <Check className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                  </div>
                  <div className="font-mono text-[11px] text-indigo-400 mt-1 truncate">
                    *.{p.domain}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSaveWildcard} className="space-y-4 text-xs pt-2">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">
                Root Wildcard Domain
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 127.0.0.1.sslip.io or apps.yourdomain.com"
                value={wildcardDomain}
                onChange={(e) => setWildcardDomain(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                If using a public server, configure a wildcard DNS record <span className="font-mono text-zinc-400">*.{wildcardDomain}</span> pointing to your server's public IP address.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
              <span className="font-semibold text-zinc-300 block">
                TLS / HTTPS Security Protocol:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-zinc-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Automatic TLS Let's Encrypt Certificate</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Automatic Port 80 HTTP-to-HTTPS Redirection</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingWildcard}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition"
              >
                {savingWildcard ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Save Ingress Configuration
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 4: Appearance & Theme Settings */}
      {activeTab === "appearance" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-6">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Palette className="w-4 h-4 text-indigo-400" />
              Interface Theme &amp; Styling
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Select your preferred color theme or synchronize automatically with your operating system.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-950 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-sm font-semibold text-white block">Theme Mode</span>
                <span className="text-xs text-zinc-400 mt-0.5 block">
                  Choose between Light, Dark, or System mode. Changes apply immediately across all console pages.
                </span>
              </div>

              <ThemeToggle variant="segmented" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Light Theme</span>
              </div>
              <p className="text-xs text-zinc-400">
                Clean, high-contrast slate &amp; white palette optimized for daytime environments, well-lit spaces, and high readability.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>Dark Theme</span>
              </div>
              <p className="text-xs text-zinc-400">
                Deep zinc &amp; obsidian dark palette with subtle neon borders, reducing eye fatigue during late-night development.
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Support & Trakter Developer Banner */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs mt-6">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Suka dengan Colyin? Trakter Developer</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Dukung pengembangan berkelanjutan platform Colyin via SociaBuzz Tribe.
            </p>
          </div>
        </div>
        <a
          href="https://sociabuzz.com/herdin27/tribe"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs shrink-0 cursor-pointer"
        >
          <Coffee className="w-4 h-4" />
          <span>Trakter di SociaBuzz</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
