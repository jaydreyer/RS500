import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border text-sm font-bold transition-[background,color,border-color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] active:translate-y-px disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        accent:
          "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_14px_28px_-18px_var(--accent)] hover:bg-[#cf3b25]",
        solid:
          "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] hover:bg-[var(--ink-soft)]",
        ghost:
          "border-[var(--line-strong)] bg-transparent text-[var(--ink)] hover:border-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_7%,transparent)]",
        quiet:
          "border-transparent bg-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-14 px-8 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "solid",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
