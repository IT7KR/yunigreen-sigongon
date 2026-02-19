"use client"

import { forwardRef, type HTMLAttributes, type ComponentType } from "react"
import { cn } from "../lib/utils"
import { Button } from "./Button"

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
        <Button
          type="button"
          onClick={action.onClick}
          variant={action.variant === "secondary" ? "secondary" : "primary"}
          className="mt-4"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
)
EmptyState.displayName = "EmptyState"

export { EmptyState, type EmptyStateProps }
