"use client";

import { forwardRef, type HTMLAttributes, type ComponentType } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "../lib/utils";
import { MotionNumber } from "./MotionNumber";
import { Skeleton } from "./Skeleton";

interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  value: number | string;
  icon?: ComponentType<{ className?: string }>;
  color?: "brand" | "green" | "blue" | "amber" | "purple" | "red";
  suffix?: string;
  prefix?: string;
  trend?: { value: number; direction: "up" | "down" };
  loading?: boolean;
  animate?: boolean;
}

const colorStyles = {
  brand: { bg: "bg-brand-point-100", text: "text-brand-point-600" },
  green: { bg: "bg-green-100", text: "text-green-600" },
  blue: { bg: "bg-blue-100", text: "text-blue-600" },
  amber: { bg: "bg-amber-100", text: "text-amber-600" },
  purple: { bg: "bg-purple-100", text: "text-purple-600" },
  red: { bg: "bg-red-100", text: "text-red-600" },
};

const trendStyles = {
  up: { color: "text-green-600", Icon: TrendingUp },
  down: { color: "text-red-600", Icon: TrendingDown },
};

const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      title,
      value,
      icon: Icon,
      color = "brand",
      suffix,
      prefix,
      trend,
      loading = false,
      animate = true,
      className,
      ...props
    },
    ref,
  ) => {
    const colors = colorStyles[color];

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md",
          className,
        )}
        {...props}
      >
        <div className="flex flex-col justify-between h-full min-h-[100px]">
          <div className="flex items-start justify-between">
            <p className="text-sm font-semibold text-slate-600 leading-none">
              {title}
            </p>
            {Icon && (
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  colors.bg,
                )}
              >
                <Icon className={cn("h-5 w-5", colors.text)} />
              </div>
            )}
          </div>

          <div className="mt-3">
            {loading ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <div>
                <div className="flex items-baseline gap-1">
                  {prefix && (
                    <span className="text-lg font-bold text-slate-900">
                      {prefix}
                    </span>
                  )}
                  {animate && typeof value === "number" ? (
                    <MotionNumber
                      value={value}
                      className="text-3xl font-extrabold text-slate-900 tracking-tight"
                    />
                  ) : (
                    <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                      {value}
                    </span>
                  )}
                  {suffix && (
                    <span className="text-sm font-bold text-slate-500">
                      {suffix}
                    </span>
                  )}
                </div>

                {trend && !loading && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 font-bold leading-none">
                    <span
                      className={cn(
                        "text-sm",
                        trend.direction === "up"
                          ? "text-green-600"
                          : "text-red-600",
                      )}
                    >
                      {trend.direction === "up" ? "▲" : "▼"} {trend.value}%
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      지난달 대비
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);
StatCard.displayName = "StatCard";

export { StatCard, type StatCardProps };
