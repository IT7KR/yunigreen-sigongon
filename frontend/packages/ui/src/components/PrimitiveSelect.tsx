"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "../lib/utils";

export interface PrimitiveSelectProps
  extends SelectHTMLAttributes<HTMLSelectElement> {}

const PrimitiveSelect = forwardRef<HTMLSelectElement, PrimitiveSelectProps>(
  ({ className, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900",
          "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-point-500 focus-visible:ring-offset-2",
          className,
        )}
        {...props}
      />
    );
  },
);

PrimitiveSelect.displayName = "PrimitiveSelect";

export { PrimitiveSelect };
