"use client";

import { AlertTriangle, X } from "lucide-react";
import { cn } from "@sigongon/ui";

interface ExistingPhoto {
  url: string;
  name: string;
  similarity: number;
}

interface DuplicateWarningProps {
  existingPhoto: ExistingPhoto;
  onContinue: () => void;
  onCancel: () => void;
}

export function DuplicateWarning({
  existingPhoto,
  onContinue,
  onCancel,
}: DuplicateWarningProps) {
  const similarityPercent = Math.round(existingPhoto.similarity * 100);

  return (
    <div className="fixed inset-x-0 top-0 z-50 mx-auto max-w-lg p-4">
      <div className="overflow-hidden rounded-lg border-2 border-yellow-400 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-3 bg-yellow-50 px-4 py-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-yellow-100">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-900">
              유사한 사진이 이미 있습니다
            </h3>
            <p className="text-sm text-yellow-700">
              {similarityPercent}% 일치하는 사진이 발견되었습니다
            </p>
          </div>
          <button
            onClick={onCancel}
            className="flex-shrink-0 rounded-lg p-1 text-yellow-600 hover:bg-yellow-100"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Photo Comparison */}
        <div className="p-4">
          <div className="mb-3">
            <p className="text-sm font-medium text-slate-700">
              기존 사진: {existingPhoto.name}
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <img
              src={existingPhoto.url}
              alt="기존 사진"
              className="h-48 w-full object-cover"
            />
          </div>

          <div className="mt-3 rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-600">
              동일하거나 매우 유사한 사진이 이미 업로드되어 있습니다. 계속
              진행하시겠습니까?
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <button
            onClick={onCancel}
            className={cn(
              "flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5",
              "text-sm font-medium text-slate-700",
              "transition-colors hover:bg-slate-50"
            )}
          >
            취소
          </button>
          <button
            onClick={onContinue}
            className={cn(
              "flex-1 rounded-lg bg-brand-point-500 px-4 py-2.5",
              "text-sm font-medium text-white",
              "transition-colors hover:bg-brand-point-600"
            )}
          >
            그래도 업로드
          </button>
        </div>
      </div>
    </div>
  );
}
