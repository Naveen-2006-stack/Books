import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", {
  variants: {
    variant: {
      default: "bg-slate-100/90 text-slate-700 ring-slate-200",
      posted: "bg-sky-100/90 text-sky-700 ring-sky-200",
      success: "bg-emerald-100/90 text-emerald-700 ring-emerald-200",
      warning: "bg-amber-100/90 text-amber-700 ring-amber-200",
      danger: "bg-rose-100/90 text-rose-700 ring-rose-200",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
