"use client";

import { Check, ChevronRight, X } from "lucide-react";
import { cn } from "../lib/utils";
import { PrimitiveButton } from "./PrimitiveButton";

export interface ConsentItem {
  key: string;
  label: string;
  required: boolean;
  description?: string;
  onViewDetail?: () => void;
}

export interface ConsentCheckboxGroupProps {
  items: ConsentItem[];
  values: Record<string, boolean>;
  onChange: (values: Record<string, boolean>) => void;
  showSelectAll?: boolean;
  error?: string;
}

export function ConsentCheckboxGroup({
  items,
  values,
  onChange,
  showSelectAll = true,
  error,
}: ConsentCheckboxGroupProps) {
  const allChecked = items.length > 0 && items.every((item) => values[item.key]);

  function handleSelectAll() {
    const next = !allChecked;
    const updated: Record<string, boolean> = {};
    for (const item of items) {
      updated[item.key] = next;
    }
    onChange(updated);
  }

  function handleToggle(key: string) {
    onChange({ ...values, [key]: !values[key] });
  }

  return (
    <div className="space-y-2">
      {showSelectAll && (
        <PrimitiveButton
          type="button"
          onClick={handleSelectAll}
          className={cn(
            "w-full flex items-center gap-3 rounded-xl border p-4 text-left transition-colors",
            allChecked
              ? "border-brand-point-400 bg-brand-point-50"
              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
          )}
        >
          <span
            className={cn(
              "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors",
              allChecked
                ? "border-brand-point-500 bg-brand-point-500"
                : "border-slate-300",
            )}
          >
            {allChecked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
          </span>
          <span className={cn(
            "text-sm font-semibold transition-colors",
            allChecked ? "text-brand-point-700" : "text-slate-800",
          )}>
            전체 동의합니다
          </span>
        </PrimitiveButton>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {items.map((item, idx) => {
          const checked = !!values[item.key];
          return (
            <div
              key={item.key}
              className={cn(idx > 0 && "border-t border-slate-100")}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  onClick={() => handleToggle(item.key)}
                  className="flex items-center gap-3 flex-1 text-left min-w-0"
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors",
                      checked
                        ? "border-brand-point-500 bg-brand-point-500"
                        : "border-slate-300 bg-white",
                    )}
                  >
                    {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                  </span>
                  <span className="text-sm text-slate-700 leading-snug">
                    {item.label}
                    <span className={cn(
                      "text-xs ml-1.5",
                      item.required ? "text-brand-point-500 font-medium" : "text-slate-400",
                    )}>
                      ({item.required ? "필수" : "선택"})
                    </span>
                  </span>
                </button>
                {item.onViewDetail && (
                  <button
                    type="button"
                    onClick={item.onViewDetail}
                    className="flex items-center gap-0.5 text-xs text-slate-400 hover:text-brand-point-600 transition-colors flex-shrink-0 ml-2"
                  >
                    보기
                    <ChevronRight className="h-3 w-3" />
                  </button>
                )}
              </div>
              {item.description && (
                <p className="px-4 pb-3 pl-12 text-xs text-slate-400 leading-relaxed">
                  {item.description}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-sm text-red-500">
          <X className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
