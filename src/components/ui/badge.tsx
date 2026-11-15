import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide whitespace-nowrap", {
  variants: {
    variant: {
      default: "border-primary/40 bg-primary/15 text-purple-300",
      secondary: "border-primary/30 bg-primary/10 text-purple-200",
      gold: "border-amber-400/40 bg-amber-400/10 text-amber-300",
      success: "border-success/40 bg-success/10 text-emerald-300",
      warning: "border-warning/40 bg-warning/10 text-amber-300",
      danger: "border-danger/40 bg-danger/10 text-red-300",
      muted: "border-border bg-white/5 text-muted",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
