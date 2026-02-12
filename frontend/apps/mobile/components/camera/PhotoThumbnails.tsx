"use client";

import { useState } from "react";
import { X, Camera, Search, MapPin, Info } from "lucide-react";
import { PrimitiveButton, cn } from "@sigongon/ui";
import type { PhotoType } from "./PhotoTypeSelector";
import { PhotoMetadata } from "./PhotoMetadata";

export interface PhotoItem {
  id: string;
  url: string;
  type: PhotoType;
  timestamp: Date;
  exif?: {
    dateTime?: string;
    latitude?: number;
    longitude?: number;
  };
}

interface PhotoThumbnailsProps {
  photos: PhotoItem[];
  onDelete: (id: string) => void;
}

const photoTypeIcons = {
  before: Camera,
  detail: Search,
  current: MapPin,
} as const;

const photoTypeBadgeColors = {
  before: "bg-brand-primary-500 text-white",
  detail: "bg-amber-500 text-white",
  current: "bg-brand-point-500 text-white",
} as const;

const photoTypeLabels = {
  before: "공사전",
  detail: "상세",
  current: "현황",
} as const;

export function PhotoThumbnails({ photos, onDelete }: PhotoThumbnailsProps) {
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);

  if (photos.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="rounded-full bg-slate-100 p-4">
            <Camera className="h-8 w-8 text-slate-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-700">사진을 촬영해주세요</p>
            <p className="mt-1 text-sm text-slate-500">
              아래 카메라 버튼을 눌러 촬영을 시작하세요
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          촬영된 사진
        </h3>
        <span className="rounded-full bg-brand-point-500 px-2.5 py-0.5 text-xs font-bold text-white">
          {photos.length}장
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {photos.map((photo) => {
          const Icon = photoTypeIcons[photo.type];
          const badgeColor = photoTypeBadgeColors[photo.type];
          const label = photoTypeLabels[photo.type];
          const hasExifData = photo.exif && (
            photo.exif.dateTime ||
            (photo.exif.latitude !== undefined && photo.exif.longitude !== undefined)
          );

          return (
            <div key={photo.id} className="flex-shrink-0 space-y-2">
              <div
                className="group relative overflow-hidden rounded-xl"
              >
                {/* Photo */}
                <div className="relative h-32 w-32 overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-100 shadow-md transition-all group-hover:border-brand-point-500 group-hover:shadow-lg">
                  <img
                    src={photo.url}
                    alt={`${label} 사진`}
                    className="h-full w-full object-cover"
                  />

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>

                {/* Type badge */}
                <div
                  className={cn(
                    "absolute left-2 top-2 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold shadow-lg",
                    badgeColor
                  )}
                >
                  <Icon className="h-3 w-3" strokeWidth={2.5} />
                  {label}
                </div>

                {/* EXIF metadata indicator */}
                {hasExifData && (
                  <PrimitiveButton
                    onClick={() => setSelectedPhotoId(
                      selectedPhotoId === photo.id ? null : photo.id
                    )}
                    className="absolute left-2 bottom-8 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg transition-all hover:bg-blue-600 hover:scale-110"
                    aria-label="메타데이터 보기"
                    title="메타데이터 보기"
                  >
                    <Info className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </PrimitiveButton>
                )}

                {/* Delete button */}
                <PrimitiveButton
                  onClick={() => onDelete(photo.id)}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow-lg transition-all hover:bg-red-600 hover:scale-110 group-hover:opacity-100"
                  aria-label="사진 삭제"
                >
                  <X className="h-4 w-4" strokeWidth={2.5} />
                </PrimitiveButton>

                {/* Timestamp */}
                <div className="absolute bottom-2 left-2 right-2 truncate rounded bg-black/60 px-2 py-1 text-center text-xs font-medium text-white backdrop-blur-sm">
                  {photo.timestamp.toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>

              {/* Metadata display */}
              {selectedPhotoId === photo.id && photo.exif && (
                <div className="w-64 animate-in fade-in slide-in-from-top-2 duration-200">
                  <PhotoMetadata
                    dateTime={photo.exif.dateTime}
                    latitude={photo.exif.latitude}
                    longitude={photo.exif.longitude}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
