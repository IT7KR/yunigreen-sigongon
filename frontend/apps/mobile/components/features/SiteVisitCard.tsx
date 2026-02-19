"use client";

import Link from "next/link";
import { Camera, Calendar, ChevronRight } from "lucide-react";
import { Badge } from "@sigongon/ui";
import { formatDate } from "@sigongon/ui";
import type { VisitType } from "@sigongon/types";

const visitTypeLabels: Record<
  VisitType,
  { label: string; variant: "default" | "info" | "success" }
> = {
  initial: { label: "최초 방문", variant: "info" },
  progress: { label: "진행 점검", variant: "default" },
  completion: { label: "준공 확인", variant: "success" },
};

interface SiteVisitCardProps {
  visit: {
    id: string;
    visit_type: VisitType;
    visited_at: string;
    photo_count: number;
    estimated_area_m2?: string;
  };
  projectId: string;
}

export function SiteVisitCard({ visit, projectId }: SiteVisitCardProps) {
  const typeConfig = visitTypeLabels[visit.visit_type] || {
    label: visit.visit_type,
    variant: "default" as const,
  };

  return (
    <Link
      href={`/projects/${projectId}/visits/${visit.id}`}
      className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-brand-point-200 hover:bg-slate-100"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
          <Camera className="h-5 w-5 text-slate-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Badge variant={typeConfig.variant}>{typeConfig.label}</Badge>
            <span className="text-xs text-slate-400">
              사진 {visit.photo_count}장
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
            <Calendar className="h-3 w-3" />
            {formatDate(visit.visited_at)}
          </div>
          {visit.estimated_area_m2 && (
            <div className="mt-0.5 text-xs text-slate-500">
              면적 {visit.estimated_area_m2}㎡
            </div>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-400" />
    </Link>
  );
}
