"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Camera, Plus, Loader2, MapPin, FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  formatDate,
  Badge,
} from "@sigongon/ui";
import type { SiteVisitDetail, VisitType } from "@sigongon/types";
import { api } from "@/lib/api";

const visitTypeLabels: Record<VisitType, string> = {
  initial: "최초 방문",
  progress: "진행 점검",
  completion: "준공 확인",
};

const visitTypeBadgeColors: Record<VisitType, string> = {
  initial: "bg-blue-100 text-blue-700",
  progress: "bg-yellow-100 text-yellow-700",
  completion: "bg-green-100 text-green-700",
};

export default function VisitsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const [visits, setVisits] = useState<SiteVisitDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVisits();
  }, [projectId]);

  async function loadVisits() {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getSiteVisits(projectId);
      if (response.success && response.data) {
        setVisits(response.data);
      }
    } catch (err) {
      setError("현장방문 목록을 불러오는데 실패했어요");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleAddVisit() {
    window.open(
      `http://localhost:3134/projects/${projectId}/visits/new`,
      "_blank",
    );
  }

  function handleViewVisit(visitId: string) {
    window.open(
      `http://localhost:3134/projects/${projectId}/visits/${visitId}`,
      "_blank",
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-red-500">{error}</p>
        <Button onClick={loadVisits}>다시 시도</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-slate-400" />
            현장 방문 목록
          </CardTitle>
          <Button onClick={handleAddVisit}>
            <Plus className="h-4 w-4" />
            방문 추가
          </Button>
        </CardHeader>
        <CardContent>
          {visits.length === 0 ? (
            <div className="py-16 text-center">
              <Camera className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 text-slate-500">
                아직 현장 방문 기록이 없습니다.
              </p>
              <p className="mt-1 text-sm text-slate-400">
                현장 방문을 추가하고 사진을 촬영해 보세요.
              </p>
              <Button className="mt-6" onClick={handleAddVisit}>
                <Plus className="h-4 w-4" />
                첫 방문 추가하기
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                    <th className="pb-3 font-medium">방문일시</th>
                    <th className="pb-3 font-medium">방문유형</th>
                    <th className="pb-3 font-medium">사진 수</th>
                    <th className="pb-3 font-medium">메모</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((visit) => (
                    <tr
                      key={visit.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="py-4 font-medium text-slate-900">
                        {formatDate(visit.visited_at)}
                      </td>
                      <td className="py-4">
                        <Badge
                          className={visitTypeBadgeColors[visit.visit_type]}
                        >
                          {visitTypeLabels[visit.visit_type]}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Camera className="h-4 w-4" />
                          {visit.photo_count}장
                        </div>
                      </td>
                      <td className="py-4 text-slate-500">
                        {visit.notes ? (
                          <div className="flex items-center gap-1 text-sm">
                            <FileText className="h-4 w-4" />
                            {visit.notes.length > 30
                              ? `${visit.notes.slice(0, 30)}...`
                              : visit.notes}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-4">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleViewVisit(visit.id)}
                        >
                          상세보기
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {visits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-slate-400" />
              방문 통계
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm text-slate-500">총 방문 횟수</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {visits.length}회
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm text-slate-500">총 사진 수</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {visits.reduce((sum, v) => sum + v.photo_count, 0)}장
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm text-slate-500">최근 방문</p>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {visits.length > 0
                    ? formatDate(visits[0].visited_at)
                    : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
