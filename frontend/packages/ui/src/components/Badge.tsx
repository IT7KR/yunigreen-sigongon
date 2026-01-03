import { cn } from "../lib/utils"
import type { ProjectStatus } from "@yunigreen/types"

const statusConfig: Record<ProjectStatus, { label: string; className: string }> = {
  draft: {
    label: "초안",
    className: "bg-slate-100 text-slate-700 before:bg-slate-400",
  },
  diagnosing: {
    label: "진단중",
    className: "bg-blue-50 text-blue-700 before:bg-blue-500",
  },
  estimating: {
    label: "견적중",
    className: "bg-amber-50 text-amber-700 before:bg-amber-500",
  },
  quoted: {
    label: "견적발송",
    className: "bg-purple-50 text-purple-700 before:bg-purple-500",
  },
  contracted: {
    label: "계약완료",
    className: "bg-teal-50 text-teal-700 before:bg-teal-500",
  },
  in_progress: {
    label: "공사중",
    className: "bg-orange-50 text-orange-700 before:bg-orange-500",
  },
  completed: {
    label: "준공",
    className: "bg-green-50 text-green-700 before:bg-green-500",
  },
  warranty: {
    label: "하자보증",
    className: "bg-slate-50 text-slate-600 before:bg-slate-400",
  },
}

interface StatusBadgeProps {
  status: ProjectStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        "before:h-1.5 before:w-1.5 before:rounded-full",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}

interface BadgeProps {
  children: React.ReactNode
  variant?: "default" | "success" | "warning" | "error" | "info"
  className?: string
}

const variantStyles = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-green-50 text-green-700",
  warning: "bg-amber-50 text-amber-700",
  error: "bg-red-50 text-red-700",
  info: "bg-blue-50 text-blue-700",
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
