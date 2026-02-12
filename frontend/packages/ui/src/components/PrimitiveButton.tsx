"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../lib/utils";

export interface PrimitiveButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {}

const PrimitiveButton = forwardRef<HTMLButtonElement, PrimitiveButtonProps>(
  ({ className, ...props }, ref) => {
    return (
      <button
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

PrimitiveButton.displayName = "PrimitiveButton";

export { PrimitiveButton };
