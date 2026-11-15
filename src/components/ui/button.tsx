import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default: "btn3d btn3d-accent",
        gold: "btn3d btn3d-accent",
        secondary: "btn3d btn3d-dark",
        discord: "btn3d btn3d-discord",
        outline: "border border-border bg-white/5 text-foreground hover:bg-white/10 hover:border-primary/50",
        accentOutline: "btn-outline-accent",
        ghost: "hover:bg-white/5",
        destructive: "btn3d btn3d-danger",
        link: "text-primary underline-offset-4 hover:underline px-0",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3.5 text-xs",
        lg: "h-14 px-7 text-sm",
        icon: "h-10 w-10",
      },
    },
    compoundVariants: [
      { variant: ["default", "gold", "secondary", "discord", "destructive"], size: "sm", class: "rounded-lg tracking-normal" },
    ],
    defaultVariants: { variant: "default", size: "default" },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean; loading?: boolean };

export function Button({ className, variant, size, asChild, loading, children, disabled, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...props}>
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Loader2 className="animate-spin" aria-hidden />}
          {children}
        </>
      )}
    </Comp>
  );
}

export { buttonVariants };
