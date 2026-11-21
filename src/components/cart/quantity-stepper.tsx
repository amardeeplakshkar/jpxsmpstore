"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "lib/utils";

type Props = {
  value: number;
  max: number;
  onChange: (qty: number) => void;
  /** "compact" fits next to the icon-only cart button on product cards. */
  size?: "compact" | "large";
  className?: string;
};

/** - qty + control. Clicks never bubble, so it is safe inside a card that is itself a link. */
export function QuantityStepper({ value, max, onChange, size = "large", className }: Props) {
  const step = (delta: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(Math.min(max, Math.max(1, value + delta)));
  };
  const btn = cn(
    "grid h-full cursor-pointer place-items-center text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30",
    size === "compact" ? "w-8" : "w-12",
  );
  return (
    <div
      role="group"
      aria-label="Quantity"
      className={cn("inline-flex items-stretch overflow-hidden rounded-xl border border-white/10 bg-black/40", size === "compact" ? "h-12" : "h-14", className)}
    >
      <button type="button" className={btn} onClick={step(-1)} disabled={value <= 1} aria-label="Decrease quantity">
        <Minus className="size-4" />
      </button>
      <output aria-live="polite" className={cn("grid place-items-center font-black tabular-nums text-white", size === "compact" ? "min-w-6 text-sm" : "min-w-10 text-base")}>
        {value}
      </output>
      <button type="button" className={btn} onClick={step(1)} disabled={value >= max} aria-label="Increase quantity">
        <Plus className="size-4" />
      </button>
    </div>
  );
}
