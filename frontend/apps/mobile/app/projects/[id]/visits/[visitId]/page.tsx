"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/MobileLayout";
import { Card, CardContent, Button, Badge, formatDate } from "@sigongon/ui";
import { useSiteVisits, useRequestDiagnosis } from "@/hooks";
import { Camera, Calendar, Sparkles, Loader2, Plus, ChevronRight } from "lucide-react";
import type { PhotoType, VisitType } from "@sigongon/types";

interface SiteVisitDetailPageProps {
  params: Promise<{ id: string; visitId: string }>;
}

const visitTypeLabel: Record<VisitType, string> = {
  initial: "최초 방문",
  progress: "진행 점검",
  completion: "준공 확인",
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

export default function SiteVisitDetailPage({ params }: SiteVisitDetailPageProps) {
  const { id: projectId, visitId } = use(params);
  const router = useRouter();
  const { data, isLoading } = useSiteVisits(projectId);
  const requestDiagnosis = useRequestDiagnosis();

  const visit =
    data?.success && data.data
      ? data.data.find((item) => item.id === visitId)
      : undefined;

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
      const response = await requestDiagnosis.mutateAsync({
        visitId: visit.id,
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
      <MobileLayout title="현장방문 상세" showBack>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" />
        </div>
      </MobileLayout>
    );
  }

  if (!visit) {
    return (
      <MobileLayout title="현장방문 상세" showBack>
        <div className="flex h-64 flex-col items-center justify-center gap-4 p-4">
          <p className="text-sm text-slate-500">방문 기록을 찾을 수 없어요.</p>
          <Button asChild><Link href={`/projects/${projectId}/visits/new`}>
              <Plus className="h-4 w-4" />
              현장방문 기록 추가
            </Link></Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout
      title="현장방문 상세"
      showBack
      rightAction={
        <Badge variant="info">{visitTypeLabel[visit.visit_type]}</Badge>
      }
    >
      <div className="space-y-4 p-4">
        <Card>
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span>{formatDate(visit.visited_at)}</span>
            </div>
            {visit.estimated_area_m2 && (
              <p className="text-sm text-slate-600">
                면적 산출:{" "}
                <span className="font-semibold text-slate-900">
                  {visit.estimated_area_m2}㎡
                </span>
              </p>
            )}
            {visit.notes ? (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                {visit.notes}
              </p>
            ) : (
              <p className="text-sm text-slate-500">메모가 없습니다.</p>
            )}
            <Button
              fullWidth
              onClick={handleRequestDiagnosis}
              loading={requestDiagnosis.isPending}
              disabled={requestDiagnosis.isPending}
            >
              <Sparkles className="h-4 w-4" />
              AI 진단 요청
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-medium text-slate-900">사진 현황</p>
              <span className="text-sm text-slate-500">
                총 {visit.photo_count}장
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["before", "during", "after", "detail"] as const).map((type) => (
                <div
                  key={type}
                  className="rounded-lg border border-slate-200 px-3 py-2"
                >
                  <p className="text-xs text-slate-500">{photoTypeLabel[type]}</p>
                  <p className="text-lg font-bold text-slate-900">{photoStats[type]}장</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-4">
            {visit.photos.length === 0 ? (
              <div className="py-6 text-center">
                <Camera className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">등록된 사진이 없습니다.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {visit.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="overflow-hidden rounded-lg border border-slate-200"
                  >
                    {photo.storage_path.startsWith("http") ||
                    photo.storage_path.startsWith("blob:") ||
                    photo.storage_path.startsWith("data:") ? (
                      <img
                        src={photo.storage_path}
                        alt={photo.caption || "현장 사진"}
                        className="aspect-square w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-square items-center justify-center bg-slate-100">
                        <Camera className="h-7 w-7 text-slate-400" />
                      </div>
                    )}
                    <div className="space-y-1 p-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${photoTypeBadgeClass[photo.photo_type]}`}
                      >
                        {photoTypeLabel[photo.photo_type]}
                      </span>
                      <p className="line-clamp-2 text-xs text-slate-600">
                        {photo.caption || "설명 없음"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Button variant="secondary" fullWidth asChild><Link href={`/projects/${projectId}/visits/new`}>
            <Plus className="h-4 w-4" />
            추가 방문/사진 등록
            <ChevronRight className="h-4 w-4" />
          </Link></Button>
      </div>
    </MobileLayout>
  );
}
