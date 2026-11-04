"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 hover:text-white rounded border border-zinc-700 transition"
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 text-zinc-400" />
          <span>{label || "Copy"}</span>
        </>
      )}
    </button>
  );
}
