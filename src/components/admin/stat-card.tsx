import type { LucideIcon } from "lucide-react";
import { cn } from "lib/utils";

export function StatCard({ label, value, icon: Icon, tone = "primary", hint }: { label: string; value: string; icon: LucideIcon; tone?: "primary" | "secondary" | "accent" | "success" | "warning"; hint?: string }) {
  const tones = {
    primary: "text-violet-300 bg-primary/15",
    secondary: "text-cyan-300 bg-secondary/10",
    accent: "text-amber-300 bg-accent/10",
    success: "text-green-300 bg-success/10",
    warning: "text-amber-300 bg-warning/10",
  };
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        <span className={cn("rounded-lg p-2", tones[tone])}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-black">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}
