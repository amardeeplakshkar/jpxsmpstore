import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold whitespace-nowrap", {
  variants: {
    variant: {
      default: "border-primary/40 bg-primary/15 text-violet-300",
      secondary: "border-secondary/40 bg-secondary/10 text-cyan-300",
      gold: "border-accent/40 bg-accent/10 text-amber-300",
      success: "border-success/40 bg-success/10 text-green-300",
      warning: "border-warning/40 bg-warning/10 text-amber-300",
      danger: "border-danger/40 bg-danger/10 text-rose-300",
      muted: "border-border bg-elevated text-muted",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
