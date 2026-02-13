"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, Button, Badge, formatDate } from "@sigongon/ui";
import { useSiteVisit, useRequestDiagnosis } from "@/hooks";
import {
  Camera,
  Calendar,
  Sparkles,
  Loader2,
  ChevronLeft,
  ArrowLeft,
} from "lucide-react";
import type { PhotoType, VisitType } from "@sigongon/types";

interface VisitDetailPageProps {
  params: Promise<{ id: string; visitId: string }>;
}

const visitTypeLabel: Record<VisitType, string> = {
  initial: "최초 방문",
  progress: "진행 점검",
  completion: "준공 확인",
};

const visitTypeBadgeClass: Record<VisitType, string> = {
  initial: "bg-blue-100 text-blue-700",
  progress: "bg-amber-100 text-amber-700",
  completion: "bg-emerald-100 text-emerald-700",
};

const photoTypeLabel: Record<PhotoType, string> = {
  before: "시공 전",
  during: "시공 중",
  after: "시공 후",
  detail: "상세",
};

const photoTypeBadgeClass: Record<PhotoType, string> = {
  before: "bg-blue-100 text-blue-700",
  during: "bg-amber-100 text-amber-700",
  after: "bg-emerald-100 text-emerald-700",
  detail: "bg-slate-100 text-slate-700",
};

export default function VisitDetailPage({ params }: VisitDetailPageProps) {
  const { id: projectId, visitId } = use(params);
  const router = useRouter();
  const { data, isLoading } = useSiteVisit(visitId);
  const requestDiagnosis = useRequestDiagnosis();

  const visit = data?.success && data.data ? data.data : undefined;

  const photoStats = useMemo(() => {
    const base: Record<PhotoType, number> = {
      before: 0,
      during: 0,
      after: 0,
      detail: 0,
    };
    if (!visit) return base;
    visit.photos.forEach((photo) => {
      base[photo.photo_type] += 1;
    });
    return base;
  }, [visit]);

  async function handleRequestDiagnosis() {
    if (!visit) return;

    try {
      const allPhotoIds = visit.photos.map((p) => p.id);
      const response = await requestDiagnosis.mutateAsync({
        visitId: visit.id,
        data: {
          photo_ids: allPhotoIds,
          additional_notes: visit.notes,
        },
      });
      if (response.success && response.data) {
        router.push(`/diagnoses/${response.data.diagnosis_id}`);
      }
    } catch (error) {
      console.error("진단 요청 실패:", error);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" />
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-sm text-slate-500">방문 기록을 찾을 수 없습니다.</p>
        <Button variant="secondary" asChild><Link href={`/projects/${projectId}/visits`}>
            <ArrowLeft className="h-4 w-4" />
            방문 목록으로
          </Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb / Back link */}
      <div className="flex items-center gap-2">
        <Link
          href={`/projects/${projectId}/visits`}
          className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" />
          방문 목록으로
        </Link>
      </div>

      {/* Visit Info Card */}
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-slate-900">
                  현장방문 상세
                </h2>
                <Badge className={visitTypeBadgeClass[visit.visit_type]}>
                  {visitTypeLabel[visit.visit_type]}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span>{formatDate(visit.visited_at)}</span>
              </div>
            </div>
            <Button
              onClick={handleRequestDiagnosis}
              loading={requestDiagnosis.isPending}
              disabled={requestDiagnosis.isPending || visit.photos.length === 0}
            >
              <Sparkles className="h-4 w-4" />
              AI 진단 요청
            </Button>
          </div>

          {visit.notes ? (
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700 mb-1">메모</p>
              <p className="text-sm text-slate-600">{visit.notes}</p>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 p-4">
              <p className="text-sm text-slate-400 text-center">
                메모가 없습니다
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photo Statistics Card */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">사진 현황</h3>
            <span className="text-sm text-slate-500">
              총 {visit.photo_count}장
            </span>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {(["before", "during", "after", "detail"] as const).map((type) => (
              <div
                key={type}
                className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <p className="text-xs text-slate-500 mb-1">
                  {photoTypeLabel[type]}
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {photoStats[type]}
                  <span className="text-sm font-normal text-slate-500 ml-1">
                    장
                  </span>
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Photo Gallery Card */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            사진 갤러리
          </h3>
          {visit.photos.length === 0 ? (
            <div className="py-16 text-center">
              <Camera className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 text-sm text-slate-500">
                등록된 사진이 없습니다
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {visit.photos.map((photo) => (
                <div
                  key={photo.id}
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white hover:shadow-md transition-shadow"
                >
                  {photo.storage_path.startsWith("http") ||
                  photo.storage_path.startsWith("blob:") ||
                  photo.storage_path.startsWith("data:") ? (
                    <img
                      src={photo.storage_path}
                      alt={photo.caption || "현장 사진"}
                      className="aspect-video w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-video items-center justify-center bg-slate-100">
                      <Camera className="h-10 w-10 text-slate-400" />
                    </div>
                  )}
                  <div className="space-y-2 p-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${photoTypeBadgeClass[photo.photo_type]}`}
                    >
                      {photoTypeLabel[photo.photo_type]}
                    </span>
                    {photo.caption ? (
                      <p className="line-clamp-2 text-sm text-slate-600">
                        {photo.caption}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400">설명 없음</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
