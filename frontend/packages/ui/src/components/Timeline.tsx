"use client";

import { type ReactNode } from "react";
import { Check, Circle } from "lucide-react";
import { cn } from "../lib/utils";

export interface TimelineProps {
  items: {
    id: string;
    title: string;
    description?: string;
    date?: string;
    status: "completed" | "current" | "pending";
    icon?: ReactNode;
  }[];
  className?: string;
}

export function Timeline({ items, className }: TimelineProps) {
  return (
    <div className={cn("space-y-0", className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isCompleted = item.status === "completed";
        const isCurrent = item.status === "current";
        const isPending = item.status === "pending";

        return (
          <div key={item.id} className="relative flex gap-4 pb-8">
            {/* Timeline Line */}
            {!isLast && (
              <div
                className={cn(
                  "absolute left-5 top-12 h-full w-0.5",
                  isCompleted ? "bg-green-500" : "bg-slate-300"
                )}
              />
            )}

            {/* Icon */}
            <div className="relative flex-shrink-0">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                  isCompleted &&
                    "border-green-500 bg-green-500 text-white",
                  isCurrent &&
                    "border-brand-point-500 bg-brand-point-500 text-white",
                  isPending && "border-slate-300 bg-white text-slate-400"
                )}
              >
                {item.icon ? (
                  item.icon
                ) : isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Circle className="h-4 w-4 fill-current" />
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 pt-1">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3
                    className={cn(
                      "font-medium",
                      isCurrent && "text-brand-point-600",
                      isCompleted && "text-slate-700",
                      isPending && "text-slate-400"
                    )}
                  >
                    {item.title}
                  </h3>
                  {item.description && (
                    <p
                      className={cn(
                        "mt-1 text-sm",
                        isCurrent && "text-slate-600",
                        isCompleted && "text-slate-500",
                        isPending && "text-slate-400"
                      )}
                    >
                      {item.description}
                    </p>
                  )}
                </div>

                {item.date && (
                  <time
                    className={cn(
                      "text-sm flex-shrink-0",
                      isCurrent && "text-slate-600 font-medium",
                      isCompleted && "text-slate-500",
                      isPending && "text-slate-400"
                    )}
                  >
                    {item.date}
                  </time>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
