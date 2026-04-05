import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-white active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-slate-950 via-slate-900 to-slate-700 text-white shadow-lg shadow-slate-900/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/25 focus-visible:ring-slate-400",
        secondary: "bg-white/80 text-slate-900 ring-1 ring-slate-200/80 hover:-translate-y-0.5 hover:bg-white focus-visible:ring-slate-300",
        ghost: "text-slate-700 hover:bg-slate-950/5 focus-visible:ring-slate-300",
        outline: "border border-slate-200/80 bg-white/70 text-slate-900 hover:-translate-y-0.5 hover:bg-white focus-visible:ring-slate-300",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-xl px-3",
        lg: "h-11 rounded-xl px-8",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
