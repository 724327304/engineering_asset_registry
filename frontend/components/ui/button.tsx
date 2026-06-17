import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
};

const variants = {
  default: "bg-zinc-900 text-white hover:bg-zinc-800",
  outline:
    "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 hover:text-zinc-950",
  ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950",
};

const sizes = {
  default: "h-9 px-3.5 py-2",
  sm: "h-8 px-3 text-xs",
  icon: "h-9 w-9",
};

function Button({
  className,
  variant = "default",
  size = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      data-slot="button"
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

export { Button };
