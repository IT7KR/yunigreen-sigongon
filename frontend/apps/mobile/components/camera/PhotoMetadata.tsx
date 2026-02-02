"use client";

import { MapPin, Clock, ExternalLink } from "lucide-react";

export interface PhotoMetadataProps {
  dateTime?: string;
  latitude?: number;
  longitude?: number;
}

export function PhotoMetadata({
  dateTime,
  latitude,
  longitude,
}: PhotoMetadataProps) {
  const hasGPS = latitude !== undefined && longitude !== undefined;
  const hasMetadata = dateTime || hasGPS;

  if (!hasMetadata) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-sm text-slate-500">메타데이터 없음</p>
      </div>
    );
  }

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatCoordinate = (lat: number, lon: number) => {
    const latStr = `${Math.abs(lat).toFixed(6)}°${lat >= 0 ? "N" : "S"}`;
    const lonStr = `${Math.abs(lon).toFixed(6)}°${lon >= 0 ? "E" : "W"}`;
    return `${latStr}, ${lonStr}`;
  };

  const getGoogleMapsUrl = (lat: number, lon: number) => {
    return `https://www.google.com/maps?q=${lat},${lon}`;
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
      {dateTime && (
        <div className="flex items-start gap-2">
          <Clock className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs text-slate-500">촬영 시간</p>
            <p className="text-sm font-medium text-slate-700">
              {formatDateTime(dateTime)}
            </p>
          </div>
        </div>
      )}

      {hasGPS && (
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs text-slate-500">GPS 위치</p>
            <p className="text-sm font-medium text-slate-700">
              {formatCoordinate(latitude!, longitude!)}
            </p>
            <a
              href={getGoogleMapsUrl(latitude!, longitude!)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-brand-point-600 hover:text-brand-point-700 hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              지도에서 보기
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
