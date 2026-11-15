"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "components/ui/button";
import { cn } from "lib/utils";

export function CopyButton({ value, label, className, size = "sm", variant = "outline" }: { value: string; label?: string; className?: string; size?: "sm" | "default" | "icon"; variant?: "outline" | "ghost" | "secondary" }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(className)}
      aria-label={label ? `Copy ${label}` : "Copy"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast.success(label ? `${label} copied` : "Copied");
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Could not copy. Please copy it manually.");
        }
      }}
    >
      {copied ? <Check /> : <Copy />}
      {size !== "icon" && (label ? `Copy ${label}` : "Copy")}
    </Button>
  );
}
