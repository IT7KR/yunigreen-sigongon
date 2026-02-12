"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HardHat,
  Calendar,
  FileText,
  Users,
  CheckCircle,
  Loader2,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  formatDate,
  ConfirmModal,
} from "@sigongon/ui";
import type { ProjectStatus } from "@sigongon/types";
import { canTransition } from "@/lib/projectStatus";

interface ConstructionOverview {
  project_id: string;
  project_name: string;
  project_status: ProjectStatus;
  start_date?: string;
  expected_end_date?: string;
  actual_end_date?: string;
  progress_percentage?: number;
  daily_report_count: number;
  total_workers: number;
  total_labor_cost: string;
  has_start_report: boolean;
}

function parseDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function calculateProgressPercentage(overview: ConstructionOverview) {
  if (overview.project_status === "completed" || overview.actual_end_date) {
    return 100;
  }

  if (!overview.start_date || !overview.expected_end_date) {
    return undefined;
  }

  const startDate = parseDate(overview.start_date);
  const expectedEndDate = parseDate(overview.expected_end_date);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(expectedEndDate.getTime())) {
    return undefined;
  }

  const totalDuration = expectedEndDate.getTime() - startDate.getTime();
  if (totalDuration <= 0) {
    return undefined;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const elapsed = today.getTime() - startDate.getTime();
  const rawProgress = elapsed / totalDuration;
  const clamped = Math.max(0, Math.min(rawProgress, 0.99));
  return Math.round(clamped * 100);
}

export default function ConstructionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [overview, setOverview] = useState<ConstructionOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [completingConstruction, setCompletingConstruction] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  useEffect(() => {
    loadConstructionOverview();
  }, [id]);

  async function loadConstructionOverview() {
    try {
      setLoading(true);
      // Mock data for now - replace with actual API call when backend implements
      const mockData: ConstructionOverview = {
        project_id: id,
        project_name: "서울시 강남구 아파트 방수공사",
        project_status: "in_progress",
        start_date: "2026-01-10",
        expected_end_date: "2026-02-28",
        daily_report_count: 12,
        total_workers: 8,
        total_labor_cost: "12000000",
        has_start_report: true,
      };
      setOverview(mockData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function confirmCompleteConstruction() {
    try {
      setCompletingConstruction(true);
      // Replace with actual API call
      // await api.updateProjectStatus(id, "completed");
      setShowCompleteModal(false);
      router.push(`/projects/${id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setCompletingConstruction(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-slate-500">시공 정보를 불러올 수 없습니다.</p>
      </div>
    );
  }

  const canComplete = canTransition(overview.project_status, "completed");
  const progressPercentage =
    overview.progress_percentage ?? calculateProgressPercentage(overview);

  return (
    <div className="space-y-6">
      {/* 시공 현황 개요 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">착공일</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {overview.start_date ? formatDate(overview.start_date) : "-"}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">예상 준공일</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {overview.expected_end_date
                    ? formatDate(overview.expected_end_date)
                    : "-"}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">일일보고</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {overview.daily_report_count}건
                </p>
              </div>
              <FileText className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 진행 상태 바 */}
      {progressPercentage !== undefined && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-700">시공 진행도</p>
              <p className="text-sm font-medium text-brand-point-600">
                {progressPercentage}%
              </p>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div
                className="bg-brand-point-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 착공계 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardHat className="h-5 w-5 text-slate-400" />
              착공계
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overview.has_start_report ? (
              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4 hover:bg-slate-50">
                <div>
                  <p className="font-medium text-slate-900">착공계 작성완료</p>
                  <p className="text-sm text-slate-500">
                    {overview.start_date
                      ? formatDate(overview.start_date)
                      : "날짜 미정"}
                  </p>
                </div>
                <Link href={`/projects/${id}/reports/start`}>
                  <Button size="sm" variant="secondary">
                    상세보기
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="mb-4 text-slate-500">아직 착공계가 없습니다.</p>
                <Link href={`/projects/${id}/reports/start`}>
                  <Button>착공계 작성</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 일일보고 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-400" />
              일일보고
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4 hover:bg-slate-50">
              <div>
                <p className="font-medium text-slate-900">
                  일일보고 {overview.daily_report_count}건
                </p>
                <p className="text-sm text-slate-500">
                  작업 진행 상황 및 현장 기록
                </p>
              </div>
              <Link href={`/projects/${id}/construction/daily-reports`}>
                <Button size="sm" variant="secondary">
                  목록보기
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 배정된 일용직 요약 */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-400" />
            배정된 일용직
          </CardTitle>
          <Link href={`/projects/${id}/labor`} className="text-sm text-brand-point-600 hover:text-brand-point-700 flex items-center gap-1">
            상세
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">투입 인원</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {overview.total_workers}명
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm text-slate-500">총 일당</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {Number(overview.total_labor_cost).toLocaleString()}원
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 시공 완료 버튼 */}
      {overview.project_status === "in_progress" && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-green-900">
                  시공 완료 처리
                </h3>
                <p className="mt-1 text-sm text-green-700">
                  모든 작업이 완료되었다면 준공 상태로 변경합니다.
                </p>
              </div>
              <Button
                onClick={() => setShowCompleteModal(true)}
                disabled={!canComplete || completingConstruction}
                size="lg"
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                시공 완료
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmModal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        onConfirm={confirmCompleteConstruction}
        title="시공 완료 처리"
        description="모든 작업이 완료되었다면 준공 상태로 변경합니다. 이 작업은 되돌릴 수 없습니다."
        confirmLabel="시공 완료"
        loading={completingConstruction}
      />
    </div>
  );
}
