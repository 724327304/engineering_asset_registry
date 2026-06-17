import * as React from "react";

import { cn } from "@/lib/utils";

type BadgeProps = React.ComponentProps<"span"> & {
  variant?: "default" | "secondary" | "success" | "warning" | "destructive";
};

const variants = {
  default: "border-zinc-300 bg-zinc-100 text-zinc-700",
  secondary: "border-slate-200 bg-slate-50 text-slate-600",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  destructive: "border-rose-200 bg-rose-50 text-rose-700",
};

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium leading-5",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
