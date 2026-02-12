"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../lib/utils";

export interface PrimitiveInputProps
  extends InputHTMLAttributes<HTMLInputElement> {}

const PrimitiveInput = forwardRef<HTMLInputElement, PrimitiveInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-point-500 focus-visible:ring-offset-2",
          className,
        )}
        {...props}
      />
    );
  },
);

PrimitiveInput.displayName = "PrimitiveInput";

export { PrimitiveInput };
