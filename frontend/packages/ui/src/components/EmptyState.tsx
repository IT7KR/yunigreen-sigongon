"use client"

import { forwardRef, type HTMLAttributes, type ComponentType } from "react"
import { cn } from "../lib/utils"

interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: "primary" | "secondary"
  }
  size?: "sm" | "md" | "lg"
}

const sizeClasses = {
  sm: "py-6",
  md: "py-8",
  lg: "py-12",
}

const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ icon: Icon, title, description, action, size = "md", className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col items-center justify-center text-center", sizeClasses[size], className)}
      {...props}
    >
      {Icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <Icon className="h-6 w-6 text-slate-400" />
        </div>
      )}
      <h3 className="text-sm font-medium text-slate-900">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={cn(
            "mt-4 inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            action.variant === "secondary"
              ? "text-brand-point-600 hover:bg-brand-point-50"
              : "bg-brand-point-600 text-white hover:bg-brand-point-700"
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  )
)
EmptyState.displayName = "EmptyState"

export { EmptyState, type EmptyStateProps }
