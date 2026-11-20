"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "lib/utils";

/** Compact - / qty / + control. Stops clicks from bubbling so it works inside clickable cards. */
export function QtyStepper({ value, max, onChange, size = "md", className }: { value: number; max: number; onChange: (n: number) => void; size?: "sm" | "md"; className?: string }) {
  const btn = size === "sm" ? "size-9" : "size-12";
  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  return (
    <div className={cn("inline-flex items-center overflow-hidden rounded-xl border border-white/10 bg-black/30", className)} role="group" aria-label="Quantity">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= 1}
        onClick={(e) => {
          stop(e);
          onChange(Math.max(1, value - 1));
        }}
        className={cn("grid cursor-pointer place-items-center hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30", btn)}
      >
        <Minus className="size-4" />
      </button>
      <span className={cn("min-w-8 text-center font-black tabular-nums text-white", size === "sm" ? "text-sm" : "text-base")} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={(e) => {
          stop(e);
          onChange(Math.min(max, value + 1));
        }}
        className={cn("grid cursor-pointer place-items-center hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30", btn)}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
