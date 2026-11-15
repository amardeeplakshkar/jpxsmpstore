"use client";

import * as React from "react";
import { Check, Copy, Server } from "lucide-react";
import { toast } from "sonner";
import { cn } from "lib/utils";

/** Pill-shaped "click to copy server IP" widget from the JpxSMP design. */
export function IpCopy({ address, variant = "pill", className }: { address: string; variant?: "pill" | "button"; className?: string }) {
  const [copied, setCopied] = React.useState(false);
  if (!address) return null;
  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Server IP copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy. Please copy it manually.");
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      data-copied={copied}
      aria-label={`Copy server IP ${address}`}
      className={cn(variant === "pill" ? "ip-widget" : "btn3d btn3d-dark h-14 px-7 text-sm normal-case", className)}
    >
      <Server className={cn("size-4", copied && variant === "pill" ? "text-black" : "text-primary")} aria-hidden />
      <span className="font-extrabold">{copied ? "Copied!" : address}</span>
      {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4 opacity-50" aria-hidden />}
    </button>
  );
}
