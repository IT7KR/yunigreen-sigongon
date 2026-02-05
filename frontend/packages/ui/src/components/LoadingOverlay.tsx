"use client"

import { forwardRef, type HTMLAttributes } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "../lib/utils"

interface LoadingOverlayProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "page" | "section" | "inline"
  text?: string
}

const variantClasses = {
  page: "fixed inset-0 z-50 bg-white/80 backdrop-blur-sm",
  section: "absolute inset-0 z-10 bg-white/60 backdrop-blur-[2px] rounded-xl",
  inline: "flex justify-center py-8",
}

const spinnerSizes = {
  page: "h-8 w-8",
  section: "h-6 w-6",
  inline: "h-6 w-6",
}

const LoadingOverlay = forwardRef<HTMLDivElement, LoadingOverlayProps>(
  ({ variant = "section", text, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-center",
        variantClasses[variant],
        className
      )}
      role="status"
      aria-label={text || "로딩 중"}
      {...props}
    >
      <div className="flex flex-col items-center gap-2">
        <Loader2 className={cn("animate-spin text-brand-point-500", spinnerSizes[variant])} />
        {text && <p className="text-sm text-slate-500">{text}</p>}
      </div>
    </div>
  )
)
LoadingOverlay.displayName = "LoadingOverlay"

export { LoadingOverlay, type LoadingOverlayProps }
