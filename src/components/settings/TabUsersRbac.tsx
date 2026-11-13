"use client";

import React from "react";
import { KeyRound, Lock, Loader2, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { useSettings } from "./SettingsContext";

export function TabUsersRbac() {
  const {
    currentUser,
    users,
    loadingUsers,
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
    getRoleBadge,
  } = useSettings();

  return (
    <div className="space-y-6">
      {/* Change Account / Master Password Card */}
      <div className="rounded-xl border border-border bg-card shadow-xs p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-500" />
              Change Password
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Update the password for your current account{" "}
              {currentUser && (
                <span className="font-mono text-foreground font-semibold">({currentUser.email})</span>
              )}
              . Changes made by administrators are automatically synchronized to{" "}
              <code className="text-amber-500 font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded border border-border">
                colyin-credentials.txt
              </code>{" "}
              on this VPS host.
            </p>
          </div>
        </div>

        {passwordSuccess && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            {passwordSuccess}
          </div>
        )}
        {passwordError && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
            {passwordError}
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-3 text-xs max-w-lg">
          <div>
            <label className="block text-foreground font-semibold mb-1">New Password</label>
            <input
              type="password"
              required
              placeholder="Enter strong new password (min. 8 chars)"
              value={myPassword}
              onChange={(e) => setMyPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-input text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={savingPassword || !myPassword.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
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
      <div className="rounded-xl border border-border bg-card shadow-xs p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-500" />
            Add Collaborator / Team Member (RBAC)
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Admins can provision collaborator accounts with designated role-based access. Note: Collaborator accounts will <strong className="text-foreground">never</strong> see master credentials.
          </p>
        </div>

        {userError && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
            {userError}
          </div>
        )}
        {userSuccess && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            {userSuccess}
          </div>
        )}

        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-foreground font-semibold mb-1">Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Sarah Jenkins"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-input text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-foreground font-semibold mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="sarah@company.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-input text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-foreground font-semibold mb-1">Temporary Password</label>
              <input
                type="password"
                required
                placeholder="Minimum 8 characters"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-input text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-foreground font-semibold mb-1">Assigned Role</label>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-input text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring"
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
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Member
            </button>
          </div>
        </form>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">Registered Users &amp; Roles</span>
          <span className="text-muted-foreground">{users.length} members</span>
        </div>

        {loadingUsers ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-indigo-500" />
            Loading users...
          </div>
        ) : (
          <div className="divide-y divide-border bg-card">
            {users.map((u) => (
              <div
                key={u.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-foreground flex items-center gap-2">
                    <span>{u.name}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${getRoleBadge(
                        u.role
                      )}`}
                    >
                      {u.role}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono">{u.email}</div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-muted-foreground">
                    Joined {new Date(u.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleDeleteUser(u.id)}
                    title="Delete user"
                    className="p-1.5 rounded text-muted-foreground hover:text-rose-500 transition cursor-pointer"
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
  );
}

