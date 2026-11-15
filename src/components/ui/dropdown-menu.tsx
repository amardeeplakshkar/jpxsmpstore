"use client";

import * as React from "react";
import * as DM from "@radix-ui/react-dropdown-menu";
import { cn } from "lib/utils";

export const DropdownMenu = DM.Root;
export const DropdownMenuTrigger = DM.Trigger;

export function DropdownMenuContent({ className, ...props }: React.ComponentProps<typeof DM.Content>) {
  return (
    <DM.Portal>
      <DM.Content sideOffset={6} align="end" className={cn("z-50 min-w-44 rounded-lg border border-border bg-elevated p-1 shadow-xl", className)} {...props} />
    </DM.Portal>
  );
}

export function DropdownMenuItem({ className, ...props }: React.ComponentProps<typeof DM.Item>) {
  return (
    <DM.Item
      className={cn("flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm outline-none data-[highlighted]:bg-primary/20 [&_svg]:size-4", className)}
      {...props}
    />
  );
}

export function DropdownMenuSeparator() {
  return <DM.Separator className="my-1 h-px bg-border" />;
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof DM.Label>) {
  return <DM.Label className={cn("px-3 py-1.5 text-xs text-muted", className)} {...props} />;
}
