"use client"

import { forwardRef, type HTMLAttributes, type ComponentType } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "../lib/utils"
import { CountUp } from "./CountUp"
import { Skeleton } from "./Skeleton"

interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  value: number | string
  icon?: ComponentType<{ className?: string }>
  color?: "brand" | "green" | "blue" | "amber" | "purple" | "red"
  suffix?: string
  prefix?: string
  trend?: { value: number; direction: "up" | "down" }
  loading?: boolean
  animate?: boolean
}

const colorStyles = {
  brand: { bg: "bg-brand-point-100", text: "text-brand-point-600" },
  green: { bg: "bg-green-100", text: "text-green-600" },
  blue: { bg: "bg-blue-100", text: "text-blue-600" },
  amber: { bg: "bg-amber-100", text: "text-amber-600" },
  purple: { bg: "bg-purple-100", text: "text-purple-600" },
  red: { bg: "bg-red-100", text: "text-red-600" },
}

const trendStyles = {
  up: { color: "text-green-600", Icon: TrendingUp },
  down: { color: "text-red-600", Icon: TrendingDown },
}

const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  ({ title, value, icon: Icon, color = "brand", suffix, prefix, trend, loading = false, animate = true, className, ...props }, ref) => {
    const colors = colorStyles[color]

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md",
          className
        )}
        {...props}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500">{title}</p>
            {loading ? (
              <Skeleton className="mt-1 h-9 w-16" />
            ) : (
              <div className="mt-1 flex items-baseline gap-1">
                {prefix && <span className="text-lg font-bold text-slate-900">{prefix}</span>}
                {animate && typeof value === "number" ? (
                  <CountUp end={value} className="text-3xl font-bold text-slate-900" />
                ) : (
                  <span className="text-3xl font-bold text-slate-900">{value}</span>
                )}
                {suffix && <span className="text-lg font-medium text-slate-500">{suffix}</span>}
              </div>
            )}
            {trend && !loading && (
              <div className={cn("mt-1 flex items-center gap-1 text-xs", trendStyles[trend.direction].color)}>
                {(() => {
                  const TrendIcon = trendStyles[trend.direction].Icon
                  return <TrendIcon className="h-3 w-3" />
                })()}
                <span>{trend.value}%</span>
              </div>
            )}
          </div>
          {Icon && (
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", colors.bg)}>
              <Icon className={cn("h-5 w-5", colors.text)} />
            </div>
          )}
        </div>
      </div>
    )
  }
)
StatCard.displayName = "StatCard"

export { StatCard, type StatCardProps }
