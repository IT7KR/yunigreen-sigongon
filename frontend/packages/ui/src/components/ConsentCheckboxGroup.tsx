"use client";

import { Check, X } from "lucide-react";
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
    <div className="space-y-3">
      {showSelectAll && (
        <PrimitiveButton
          type="button"
          onClick={handleSelectAll}
          className={cn(
            "w-full flex items-center gap-3 rounded-2xl px-5 py-4 text-left font-semibold text-sm transition-all duration-200",
            allChecked
              ? "bg-brand-point-500 text-white shadow-lg shadow-brand-point-500/25"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-200",
          )}
        >
          <span
            className={cn(
              "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition-colors",
              allChecked
                ? "bg-white/25"
                : "border border-slate-300 bg-white",
            )}
          >
            {allChecked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />}
          </span>
          전체 동의합니다
        </PrimitiveButton>
      )}

      <div>
        {items.map((item, idx) => {
          const checked = !!values[item.key];
          return (
            <div
              key={item.key}
              className={cn(idx > 0 && "border-t border-slate-100")}
            >
              <div className="flex items-center gap-3 py-3 px-1">
                <button
                  type="button"
                  onClick={() => handleToggle(item.key)}
                  className="flex items-center gap-3 flex-1 text-left min-w-0"
                >
                  <span
                    className={cn(
                      "flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[4px] border-[1.5px] transition-all duration-150",
                      checked
                        ? "border-brand-point-500 bg-brand-point-500"
                        : "border-slate-300 bg-white",
                    )}
                  >
                    {checked && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                  </span>
                  <span className="text-sm text-slate-700 leading-snug">
                    {item.label}
                    <span
                      className={cn(
                        "ml-1.5 text-xs",
                        item.required
                          ? "font-medium text-brand-point-500"
                          : "text-slate-400",
                      )}
                    >
                      ({item.required ? "필수" : "선택"})
                    </span>
                  </span>
                </button>
                {item.onViewDetail && (
                  <button
                    type="button"
                    onClick={item.onViewDetail}
                    className="flex-shrink-0 text-xs text-slate-400 underline underline-offset-2 hover:text-brand-point-600 transition-colors"
                  >
                    보기
                  </button>
                )}
              </div>
              {item.description && (
                <p className="pb-2.5 pl-9 pr-1 text-xs leading-relaxed text-slate-400">
                  {item.description}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-500">
          <X className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
