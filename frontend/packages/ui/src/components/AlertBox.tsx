"use client"

import { forwardRef, type HTMLAttributes, type ComponentType, type ReactNode } from "react"
import { X, Info, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react"
import { cn } from "../lib/utils"

interface AlertBoxAction {
  label: string
  href?: string
  onClick?: () => void
}

interface AlertBoxProps extends HTMLAttributes<HTMLDivElement> {
  variant: "info" | "success" | "warning" | "error"
  title?: string
  children: ReactNode
  icon?: ComponentType<{ className?: string }>
  dismissible?: boolean
  onDismiss?: () => void
  action?: AlertBoxAction
}

const variantStyles = {
  info: {
    container: "bg-blue-50 border-blue-200",
    icon: "text-blue-600",
    title: "text-blue-800",
    text: "text-blue-700",
    action: "text-blue-700 hover:text-blue-800 font-medium",
    dismiss: "text-blue-400 hover:text-blue-600",
  },
  success: {
    container: "bg-green-50 border-green-200",
    icon: "text-green-600",
    title: "text-green-800",
    text: "text-green-700",
    action: "text-green-700 hover:text-green-800 font-medium",
    dismiss: "text-green-400 hover:text-green-600",
  },
  warning: {
    container: "bg-amber-50 border-amber-200",
    icon: "text-amber-600",
    title: "text-amber-800",
    text: "text-amber-700",
    action: "text-amber-700 hover:text-amber-800 font-medium",
    dismiss: "text-amber-400 hover:text-amber-600",
  },
  error: {
    container: "bg-red-50 border-red-200",
    icon: "text-red-600",
    title: "text-red-800",
    text: "text-red-700",
    action: "text-red-700 hover:text-red-800 font-medium",
    dismiss: "text-red-400 hover:text-red-600",
  },
}

const defaultIcons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
}

const AlertBox = forwardRef<HTMLDivElement, AlertBoxProps>(
  ({ variant, title, children, icon, dismissible, onDismiss, action, className, ...props }, ref) => {
    const styles = variantStyles[variant]
    const Icon = icon || defaultIcons[variant]

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "flex gap-3 rounded-lg border p-3",
          styles.container,
          className
        )}
        {...props}
      >
        <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", styles.icon)} />
        <div className="flex-1 min-w-0">
          {title && <p className={cn("text-sm font-medium", styles.title)}>{title}</p>}
          <div className={cn("text-sm", styles.text, title && "mt-0.5")}>{children}</div>
          {action && (
            action.href ? (
              <a href={action.href} className={cn("mt-2 inline-block text-sm", styles.action)}>
                {action.label}
              </a>
            ) : (
              <button
                type="button"
                onClick={action.onClick}
                className={cn("mt-2 text-sm", styles.action)}
              >
                {action.label}
              </button>
            )
          )}
        </div>
        {dismissible && (
          <button
            type="button"
            onClick={onDismiss}
            className={cn("shrink-0 rounded-md p-0.5 transition-colors", styles.dismiss)}
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }
)
AlertBox.displayName = "AlertBox"

export { AlertBox, type AlertBoxProps }
