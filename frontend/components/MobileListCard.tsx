"use client";

import { type ReactNode } from "react";
import { cn } from "@sigongcore/ui";

interface MetaItem {
  label?: string;
  value: ReactNode;
}

interface MobileListCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  metadata?: MetaItem[];
  onClick?: () => void;
  actions?: ReactNode;
  className?: string;
}

export function MobileListCard({
  title,
  subtitle,
  badge,
  metadata,
  onClick,
  actions,
  className,
}: MobileListCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-transform duration-150",
        onClick && "cursor-pointer active:scale-[0.98]",
        className,
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      {/* 타이틀 + 뱃지 행 */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-slate-900 truncate">{title}</div>
          {subtitle && (
            <div className="mt-0.5 text-sm text-slate-500 truncate">
              {subtitle}
            </div>
          )}
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>

      {/* 메타데이터 */}
      {metadata && metadata.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {metadata.map((item, i) => (
            <span key={i} className="text-xs text-slate-500">
              {item.label && (
                <span className="text-slate-400">{item.label} </span>
              )}
              {item.value}
            </span>
          ))}
        </div>
      )}

      {/* 액션 버튼 */}
      {actions && (
        <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      )}
    </div>
  );
}
