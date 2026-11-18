"use client";

import React, { useState } from "react";
import {
  FileCode,
  Upload,
  Trash2,
  Key,
  Terminal,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Play,
  Layers,
  Link as LinkIcon,
} from "lucide-react";
import { CopyButton } from "@/components/CopyButton";

interface MinioNpmIntegrationCardProps {
  addonId: string;
  internalConnection: {
    host: string;
    port: number;
    user: string;
    password: string;
  };
  externalConnection: {
    host: string;
    port: number;
    user: string;
    password: string;
  } | null;
  activeHost: string;
  showPassword: boolean;
}

export function MinioNpmIntegrationCard({
  addonId,
  internalConnection,
  externalConnection,
  activeHost,
  showPassword,
}: MinioNpmIntegrationCardProps) {
  const [connectionMode, setConnectionMode] = useState<"external" | "internal">(
    externalConnection ? "external" : "internal"
  );
  const [activeTab, setActiveTab] = useState<
    "client" | "upload" | "delete" | "presigned" | "env" | "testScript"
  >("client");

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  const isExternal = connectionMode === "external" && !!externalConnection;

  const targetHost = isExternal
    ? activeHost.replace(/^https?:\/\//, "").split(":")[0]
    : internalConnection.host;
  const targetPort = isExternal ? externalConnection.port : internalConnection.port;
  const targetUser = isExternal ? externalConnection.user : internalConnection.user;
  const targetPass = isExternal ? externalConnection.password : internalConnection.password;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/addons/${addonId}/minio-test`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: `${data.message} (Status: HTTP ${data.statusCode || 200})`,
          latencyMs: data.latencyMs,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || data.message || "Failed to reach MinIO service",
          latencyMs: data.latencyMs,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Network error while probing MinIO",
      });
    } finally {
      setTesting(false);
    }
  };

  const clientConfigSnippet = `import * as Minio from 'minio';

// Inisialisasi client MinIO S3
export const minioClient = new Minio.Client({
  endPoint: '${targetHost}',
  port: ${targetPort},
  useSSL: false,
  accessKey: '${targetUser}',
  secretKey: '${targetPass}',
});`;

  const uploadSnippet = `import { minioClient } from './minioClient';
import fs from 'fs';

/**
 * 1. Upload File dari Filesystem Local
 */
export async function uploadLocalFile(bucketName: string, objectName: string, filePath: string) {
  // Pastikan bucket sudah tersedia
  const exists = await minioClient.bucketExists(bucketName);
  if (!exists) {
    await minioClient.makeBucket(bucketName, 'us-east-1');
    console.log(\`Bucket '\${bucketName}' berhasil dibuat.\`);
  }

  // Upload file dari path lokal
  const uploadInfo = await minioClient.fPutObject(bucketName, objectName, filePath);
  console.log(\`File '\${objectName}' berhasil di-upload. ETag: \${uploadInfo.etag}\`);
  return uploadInfo;
}

/**
 * 2. Upload dari Memory Buffer / Stream (misal: Next.js FormData / Multer)
 */
export async function uploadBuffer(
  bucketName: string,
  objectName: string,
  buffer: Buffer,
  mimeType: string = 'application/octet-stream'
) {
  const exists = await minioClient.bucketExists(bucketName);
  if (!exists) {
    await minioClient.makeBucket(bucketName, 'us-east-1');
  }

  return await minioClient.putObject(
    bucketName,
    objectName,
    buffer,
    buffer.length,
    { 'Content-Type': mimeType }
  );
}`;

  const deleteSnippet = `import { minioClient } from './minioClient';

/**
 * 1. Hapus Single File
 */
export async function deleteFile(bucketName: string, objectName: string) {
  await minioClient.removeObject(bucketName, objectName);
  console.log(\`File '\${objectName}' di bucket '\${bucketName}' berhasil dihapus.\`);
}

/**
 * 2. Hapus Banyak File Sekaligus (Bulk Delete)
 */
export async function deleteMultipleFiles(bucketName: string, objectNames: string[]) {
  await minioClient.removeObjects(bucketName, objectNames);
  console.log(\`\${objectNames.length} file di bucket '\${bucketName}' berhasil dihapus.\`);
}`;

  const presignedSnippet = `import { minioClient } from './minioClient';

/**
 * Buat Presigned URL untuk Download (Akses file privat secara aman dengan masa berlaku)
 */
export async function getDownloadUrl(bucketName: string, objectName: string, expirySeconds = 3600) {
  // Default URL berlaku selama 1 jam (3600 detik)
  return await minioClient.presignedGetObject(bucketName, objectName, expirySeconds);
}

/**
 * Buat Presigned URL untuk Direct Upload dari Browser (S3 Client Upload)
 */
export async function getDirectUploadUrl(bucketName: string, objectName: string, expirySeconds = 600) {
  // Berlaku 10 menit untuk upload langsung
  return await minioClient.presignedPutObject(bucketName, objectName, expirySeconds);
}`;

  const envSnippet = `# MinIO / S3 Configuration
S3_ENDPOINT=${targetHost}
S3_PORT=${targetPort}
S3_USE_SSL=false
S3_ACCESS_KEY=${targetUser}
S3_SECRET_KEY=${targetPass}
S3_BUCKET_NAME=my-bucket`;

  const testScriptSnippet = `import * as Minio from 'minio';

const minioClient = new Minio.Client({
  endPoint: '${targetHost}',
  port: ${targetPort},
  useSSL: false,
  accessKey: '${targetUser}',
  secretKey: '${targetPass}',
});

async function main() {
  console.log('Testing MinIO connection...');
  try {
    const buckets = await minioClient.listBuckets();
    console.log('Koneksi MinIO BERHASIL!');
    console.log('Daftar Bucket:', buckets.map(b => b.name));

    const testBucket = 'app-test';
    const exists = await minioClient.bucketExists(testBucket);
    if (!exists) {
      await minioClient.makeBucket(testBucket, 'us-east-1');
      console.log(\`Bucket '\${testBucket}' sukses dibuat!\`);
    } else {
      console.log(\`Bucket '\${testBucket}' sudah ada.\`);
    }
  } catch (err) {
    console.error('Koneksi Gagal:', err);
  }
}

main();`;

  return (
    <div className="rounded-xl border border-border bg-card shadow-xs p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-foreground" />
              <span>Integrasi Node.js &amp; npm <code>minio</code></span>
            </h4>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-foreground border border-border">
              S3 API :9000
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Gunakan paket resmi <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-[11px]">minio</code> untuk upload, download, delete file, dan manajemen bucket S3 dari aplikasi Anda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            {testing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{testing ? "Testing API..." : "Test S3 Health"}</span>
          </button>
        </div>
      </div>

      {/* Test Result Banner */}
      {testResult && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
            testResult.success
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <span className="font-semibold block">
              {testResult.success ? "MinIO S3 Service Aktif & Siap Digunakan" : "Koneksi MinIO Gagal"}
            </span>
            <span className="text-[11px] opacity-90">{testResult.message}</span>
            {testResult.latencyMs !== undefined && (
              <span className="text-[10px] opacity-75 block mt-0.5 font-mono">
                Latency: {testResult.latencyMs}ms
              </span>
            )}
          </div>
        </div>
      )}

      {/* Installation block */}
      <div className="p-3.5 rounded-lg bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-muted-foreground shrink-0" />
          <div>
            <span className="text-muted-foreground block text-[11px] font-sans">Install Library npm minio</span>
            <span className="text-foreground font-semibold">pnpm add minio</span>
            <span className="text-muted-foreground mx-2 font-sans text-[11px]">atau</span>
            <span className="text-foreground">npm install minio</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CopyButton text="pnpm add minio" label="Copy pnpm" />
          <CopyButton text="npm install minio" label="Copy npm" />
        </div>
      </div>

      {/* Connection Mode Selector (External vs Internal) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="text-xs font-medium text-foreground">
          Pilih Lingkungan Target Koneksi:
        </div>
        <div className="inline-flex rounded-lg border border-border bg-muted/50 p-1 text-xs gap-1">
          <button
            type="button"
            onClick={() => setConnectionMode("external")}
            disabled={!externalConnection}
            className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
              connectionMode === "external"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            } ${!externalConnection ? "opacity-50 cursor-not-allowed" : ""}`}
            title={externalConnection ? "Koneksi dari Laptop / Next.js dev lokal" : "Aktifkan Public Access dahulu"}
          >
            External (Laptop / Dev Lokal / IP Publik)
          </button>
          <button
            type="button"
            onClick={() => setConnectionMode("internal")}
            className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
              connectionMode === "internal"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Internal (Docker Network di VPS)
          </button>
        </div>
      </div>

      {/* Parameter Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
        <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
          <span className="text-muted-foreground block text-[10px] font-sans">endPoint</span>
          <span className="text-foreground font-semibold truncate block">{targetHost}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
          <span className="text-muted-foreground block text-[10px] font-sans">port</span>
          <span className="text-foreground font-semibold">{targetPort}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
          <span className="text-muted-foreground block text-[10px] font-sans">accessKey</span>
          <span className="text-foreground font-semibold truncate block">{targetUser}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
          <span className="text-muted-foreground block text-[10px] font-sans">useSSL</span>
          <span className="text-foreground font-semibold">false</span>
        </div>
      </div>

      {/* Code Tabs */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab("client")}
            className={`px-3 py-1.5 rounded-t-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "client"
                ? "bg-muted text-foreground border-b-2 border-primary font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Key className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Client Setup</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`px-3 py-1.5 rounded-t-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "upload"
                ? "bg-muted text-foreground border-b-2 border-primary font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Upload File</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("delete")}
            className={`px-3 py-1.5 rounded-t-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "delete"
                ? "bg-muted text-foreground border-b-2 border-primary font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Delete File</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("presigned")}
            className={`px-3 py-1.5 rounded-t-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "presigned"
                ? "bg-muted text-foreground border-b-2 border-primary font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Presigned URL</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("env")}
            className={`px-3 py-1.5 rounded-t-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "env"
                ? "bg-muted text-foreground border-b-2 border-primary font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-muted-foreground" />
            <span>.env Config</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("testScript")}
            className={`px-3 py-1.5 rounded-t-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "testScript"
                ? "bg-muted text-foreground border-b-2 border-primary font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Test Script (Node.js)</span>
          </button>
        </div>

        {/* Code Content Box */}
        <div className="relative rounded-lg border border-border bg-muted/20 p-4 font-mono text-xs">
          <div className="absolute top-3 right-3">
            <CopyButton
              text={
                activeTab === "client"
                  ? clientConfigSnippet
                  : activeTab === "upload"
                  ? uploadSnippet
                  : activeTab === "delete"
                  ? deleteSnippet
                  : activeTab === "presigned"
                  ? presignedSnippet
                  : activeTab === "env"
                  ? envSnippet
                  : testScriptSnippet
              }
              label="Copy Code"
            />
          </div>

          <pre className="overflow-x-auto text-[11px] leading-relaxed text-foreground pr-24 whitespace-pre">
            {activeTab === "client" && clientConfigSnippet}
            {activeTab === "upload" && uploadSnippet}
            {activeTab === "delete" && deleteSnippet}
            {activeTab === "presigned" && presignedSnippet}
            {activeTab === "env" && envSnippet}
            {activeTab === "testScript" && testScriptSnippet}
          </pre>
        </div>
      </div>
    </div>
  );
}

