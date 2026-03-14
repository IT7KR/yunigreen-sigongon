"use client";

import { CheckCircle2, ChevronRight, X } from "lucide-react";
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
          className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-slate-300 hover:bg-slate-50 transition-colors"
        >
          <span
            className={cn(
              "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full",
              allChecked
                ? "bg-brand-point-600"
                : "border-2 border-slate-300",
            )}
          >
            {allChecked && <CheckCircle2 className="h-4 w-4 text-white" />}
          </span>
          <span className="font-semibold text-slate-900">전체 동의합니다</span>
        </PrimitiveButton>
      )}

      <div className="rounded-lg border border-slate-100 bg-slate-50 divide-y divide-slate-100">
        {items.map((item) => {
          const checked = !!values[item.key];
          return (
            <div key={item.key}>
              <div className="flex items-center gap-3 p-3">
                <button
                  type="button"
                  onClick={() => handleToggle(item.key)}
                  className="flex items-center gap-3 flex-1 cursor-pointer text-left"
                >
                  <span
                    className={cn(
                      "rounded flex h-5 w-5 flex-shrink-0 items-center justify-center",
                      checked
                        ? "bg-brand-point-600"
                        : "border-2 border-slate-300",
                    )}
                  >
                    {checked && <CheckCircle2 className="h-4 w-4 text-white" />}
                  </span>
                  <span className="text-sm text-slate-700">
                    {item.label}
                    {item.required ? (
                      <span className="text-xs font-medium text-brand-point-600 ml-1">(필수)</span>
                    ) : (
                      <span className="text-xs text-slate-500 ml-1">(선택)</span>
                    )}
                  </span>
                </button>
                {item.onViewDetail && (
                  <button
                    type="button"
                    onClick={item.onViewDetail}
                    className="flex items-center gap-0.5 text-xs text-slate-400 hover:text-slate-600 transition-colors ml-auto flex-shrink-0"
                  >
                    보기
                    <ChevronRight className="h-3 w-3" />
                  </button>
                )}
              </div>
              {item.description && (
                <p className="pl-8 pb-1 text-xs text-slate-400">{item.description}</p>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p className="flex items-center gap-1 text-sm text-red-600">
          <X className="h-4 w-4 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
