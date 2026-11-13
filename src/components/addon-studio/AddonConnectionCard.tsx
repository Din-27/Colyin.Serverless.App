"use client";

import React from "react";
import {
  Shield,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Download,
} from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { useAddonStudio } from "./AddonStudioContext";

export function AddonConnectionCard() {
  const {
    addonId,
    data,
    toggling,
    showPassword,
    setShowPassword,
    handleTogglePublic,
  } = useAddonStudio();

  if (!data) return null;

  const { internalConnection, externalConnection, isPublic, webManagementUiUrl } = data;

  return (
    <div className="space-y-6">
      {/* Transparency Banner */}
      <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            Transparent Connection &amp; No Black-Box Access
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            You have direct, unrestricted access to this engine from your local tools (DBeaver, TablePlus, pgAdmin, RedisInsight).
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <a
            href={`/api/addons/${addonId}/backup`}
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-xs cursor-pointer"
            title="Download SQL dump and database schema backup"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download SQL Backup</span>
          </a>

          <button
            onClick={handleTogglePublic}
            disabled={toggling}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              isPublic
                ? "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-300 hover:bg-amber-500/25"
                : "bg-secondary border-border text-foreground hover:bg-secondary/80"
            }`}
          >
            {toggling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isPublic ? "Public Access: ON" : "Public Access: OFF"}
          </button>
        </div>
      </div>

      {/* Internal Connection Details */}
      <div className="rounded-xl border border-border bg-card shadow-xs p-6 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-foreground">
            Internal Network Connection (Inside Server)
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Use these credentials inside backend services running in the same project network.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between">
            <div>
              <span className="text-muted-foreground block text-[11px] font-sans">Hostname</span>
              <span className="text-foreground">{internalConnection.host}</span>
            </div>
            <CopyButton text={internalConnection.host} />
          </div>

          <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between">
            <div>
              <span className="text-muted-foreground block text-[11px] font-sans">Internal Port</span>
              <span className="text-foreground">{internalConnection.port}</span>
            </div>
            <CopyButton text={internalConnection.port.toString()} />
          </div>

          <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between">
            <div>
              <span className="text-muted-foreground block text-[11px] font-sans">Username</span>
              <span className="text-foreground">{internalConnection.user}</span>
            </div>
            <CopyButton text={internalConnection.user} />
          </div>

          <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between">
            <div>
              <span className="text-muted-foreground block text-[11px] font-sans">Password</span>
              <span className="text-foreground">
                {showPassword ? internalConnection.password : "••••••••••••••••"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <CopyButton text={internalConnection.password} />
            </div>
          </div>
        </div>

        {internalConnection.connectionUri && (
          <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between text-xs font-mono">
            <div className="truncate mr-4">
              <span className="text-muted-foreground block text-[11px] font-sans">Internal Connection URI</span>
              <span className="text-emerald-500 font-medium truncate">
                {showPassword
                  ? internalConnection.connectionUri
                  : internalConnection.connectionUri.replace(
                      internalConnection.password,
                      "••••••••"
                    )}
              </span>
            </div>
            <CopyButton text={internalConnection.connectionUri} label="Copy URI" />
          </div>
        )}
      </div>

      {/* External / Public Remote Connection */}
      <div className="rounded-xl border border-border bg-card shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-500" />
              External / Remote Connection (DBeaver, TablePlus, Laptop)
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Direct connection credentials for your desktop client.
            </p>
          </div>
        </div>

        {isPublic && externalConnection ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground block text-[11px] font-sans">Public Host</span>
                  <span className="text-foreground">{externalConnection.host}</span>
                </div>
                <CopyButton text={externalConnection.host} />
              </div>

              <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground block text-[11px] font-sans">Public Port</span>
                  <span className="text-amber-500 font-bold">{externalConnection.port}</span>
                </div>
                <CopyButton text={externalConnection.port.toString()} />
              </div>
            </div>

            {externalConnection.connectionUri && (() => {
              const isPostgres = data.type === "POSTGRESQL";
              const isRedis = data.type === "REDIS";
              const isRabbit = data.type === "RABBITMQ";
              const dbName = externalConnection.database || "main";
              const jdbcUrl = isPostgres
                ? `jdbc:postgresql://${externalConnection.host}:${externalConnection.port}/${dbName}?ssl=false`
                : null;

              return (
                <div className="space-y-3">
                  {jdbcUrl && (
                    <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between text-xs font-mono">
                      <div className="truncate mr-4">
                        <span className="text-muted-foreground block text-[11px] font-sans">DBeaver JDBC URL (PostgreSQL)</span>
                        <span className="text-emerald-500 font-medium truncate">{jdbcUrl}</span>
                      </div>
                      <CopyButton text={jdbcUrl} label="Copy DBeaver URL" />
                    </div>
                  )}

                  <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between text-xs font-mono">
                    <div className="truncate mr-4">
                      <span className="text-muted-foreground block text-[11px] font-sans">
                        {isRedis
                          ? "Redis Connection URI"
                          : isRabbit
                          ? "AMQP Connection URI"
                          : "Client Connection URI"}
                      </span>
                      <span className="text-amber-500 font-medium truncate">
                        {showPassword
                          ? externalConnection.connectionUri
                          : externalConnection.connectionUri.replace(
                              externalConnection.password,
                              "••••••••"
                            )}
                      </span>
                    </div>
                    <CopyButton text={externalConnection.connectionUri} label="Copy Client URI" />
                  </div>

                  {/* RabbitMQ Management URL Row in External Connection */}
                  {isRabbit && webManagementUiUrl && (
                    <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-between text-xs font-mono">
                      <div className="truncate mr-4">
                        <span className="text-orange-500 font-sans font-semibold block text-[11px] flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-orange-500" />
                          RabbitMQ Web Management URL
                        </span>
                        <a
                          href={webManagementUiUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-orange-600 dark:text-orange-300 hover:underline truncate inline-flex items-center gap-1 mt-0.5"
                        >
                          <span>{webManagementUiUrl}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <CopyButton text={webManagementUiUrl} label="Copy Web URL" />
                        <a
                          href={webManagementUiUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition"
                        >
                          <span>Open UI</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="p-2.5 rounded bg-muted/40 border border-border text-[11px] text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500 font-bold shrink-0">
                        {isPostgres ? "DBeaver Tip:" : isRedis ? "Redis Tip:" : isRabbit ? "RabbitMQ Tip:" : "Connection Tip:"}
                      </span>
                      <span>
                        {isPostgres && "Pilih driver PostgreSQL di DBeaver. Tab SSL diatur ke disabled/uncheck."}
                        {isRedis && "Gunakan redis-cli, RedisInsight, atau client library ioredis/redis untuk terhubung langsung."}
                        {isRabbit && "Gunakan AMQP library (amqplib) untuk worker queue atau akses Web Console di bawah."}
                        {!isPostgres && !isRedis && !isRabbit && "Gunakan credential ini untuk terhubung dari aplikasi lokal atau cloud."}
                      </span>
                    </div>
                    <div className="text-muted-foreground font-mono text-[10px]">
                      {isPostgres && <>Database: <strong className="text-foreground">{dbName}</strong> &bull; User: <strong className="text-foreground">{externalConnection.user}</strong></>}
                      {isRedis && <>Port: <strong className="text-foreground">{externalConnection.port}</strong> &bull; Auth: <strong className="text-foreground">Password protected</strong></>}
                      {isRabbit && <>AMQP Port: <strong className="text-foreground">{externalConnection.port}</strong> &bull; Web UI: <strong className="text-orange-500">15672</strong></>}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="p-6 rounded-lg bg-muted/30 border border-border text-center text-xs text-muted-foreground">
            Public access is currently disabled for this instance. Turn on the toggle switch above to allocate an external port.
          </div>
        )}
      </div>

      {/* Web GUI Launcher for RabbitMQ / MinIO */}
      {webManagementUiUrl && (
        <div className="rounded-xl border border-border bg-card shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Globe className="w-4 h-4 text-orange-500" />
                  RabbitMQ Web Management Console &amp; Website
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/10 text-orange-500 border border-orange-500/20">
                  Port 15672
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Pantau queue message broker, laju konsumsi pesan, exchanges, dan active consumer secara visual di browser Anda.
              </p>
            </div>

            <a
              href={webManagementUiUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-xs transition shrink-0 cursor-pointer"
            >
              <span>Launch Web Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between">
              <div>
                <span className="text-muted-foreground block text-[11px] font-sans">Website URL</span>
                <a
                  href={webManagementUiUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-orange-500 hover:underline flex items-center gap-1 mt-0.5"
                >
                  {webManagementUiUrl}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <CopyButton text={webManagementUiUrl} label="Copy URL" />
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between">
              <div>
                <span className="text-muted-foreground block text-[11px] font-sans">Default Web Login</span>
                <span className="text-foreground mt-0.5 block">
                  User: <strong className="text-orange-500">guest</strong> &bull; Pass: <strong className="text-orange-500">guest</strong>
                </span>
              </div>
              <CopyButton text="guest" label="Copy User" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

