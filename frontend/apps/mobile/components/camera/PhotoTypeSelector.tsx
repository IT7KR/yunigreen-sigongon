"use client";

import { Camera, Search, MapPin } from "lucide-react";
import { PrimitiveButton, cn } from "@sigongon/ui";

export type PhotoType = "before" | "detail" | "current";

interface PhotoTypeSelectorProps {
  selectedType: PhotoType;
  onTypeChange: (type: PhotoType) => void;
}

const photoTypeConfig = {
  before: {
    label: "공사 전",
    icon: Camera,
    color: "brand-primary",
    description: "시공 전 현황",
  },
  detail: {
    label: "상세",
    icon: Search,
    color: "amber",
    description: "문제점 상세",
  },
  current: {
    label: "현황",
    icon: MapPin,
    color: "brand-point",
    description: "현재 상태",
  },
} as const;

export function PhotoTypeSelector({
  selectedType,
  onTypeChange,
}: PhotoTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          사진 유형 선택
        </h3>
        <span className="text-xs text-slate-400">
          {photoTypeConfig[selectedType].description}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(Object.entries(photoTypeConfig) as [PhotoType, typeof photoTypeConfig[PhotoType]][]).map(
          ([type, config]) => {
            const Icon = config.icon;
            const isSelected = selectedType === type;

            return (
              <PrimitiveButton
                key={type}
                onClick={() => onTypeChange(type)}
                className={cn(
                  "group relative overflow-hidden rounded-xl border-2 p-4 transition-all duration-200",
                  isSelected
                    ? "border-brand-point-500 bg-brand-point-50 shadow-lg shadow-brand-point-500/20"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                )}
              >
                {/* Background pattern */}
                <div
                  className={cn(
                    "absolute inset-0 opacity-0 transition-opacity",
                    isSelected && "opacity-5"
                  )}
                  style={{
                    backgroundImage: `repeating-linear-gradient(
                      45deg,
                      transparent,
                      transparent 10px,
                      currentColor 10px,
                      currentColor 20px
                    )`,
                  }}
                />

                {/* Content */}
                <div className="relative flex flex-col items-center gap-2">
                  <div
                    className={cn(
                      "rounded-lg p-2 transition-all",
                      isSelected
                        ? "bg-brand-point-500 text-white shadow-lg"
                        : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2.5} />
                  </div>

                  <span
                    className={cn(
                      "text-xs font-bold transition-colors",
                      isSelected
                        ? "text-brand-point-700"
                        : "text-slate-700 group-hover:text-slate-900"
                    )}
                  >
                    {config.label}
                  </span>

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-brand-point-500 shadow-md">
                      <div className="h-full w-full animate-ping rounded-full bg-brand-point-400" />
                    </div>
                  )}
                </div>
              </PrimitiveButton>
            );
          }
        )}
      </div>
    </div>
  );
}
