"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  ChevronRight,
  Camera,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  formatDate,
} from "@sigongon/ui";
import { useDiagnoses } from "@/hooks";
import type { DiagnosisStatus } from "@sigongon/types";

const statusConfig: Record<
  DiagnosisStatus,
  {
    label: string;
    icon: React.ReactNode;
    variant: "default" | "success" | "warning" | "error" | "info";
  }
> = {
  pending: {
    label: "대기중",
    icon: <Clock className="h-4 w-4" />,
    variant: "default",
  },
  processing: {
    label: "분석중",
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    variant: "info",
  },
  completed: {
    label: "완료",
    icon: <CheckCircle2 className="h-4 w-4" />,
    variant: "success",
  },
  failed: {
    label: "실패",
    icon: <XCircle className="h-4 w-4" />,
    variant: "error",
  },
};

export default function DiagnosesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const { data, isLoading, error } = useDiagnoses(projectId);

  function handleViewDiagnosis(diagnosisId: string) {
    router.push(`/diagnoses/${diagnosisId}`);
  }

  function handleRequestDiagnosis() {
    router.push(`/projects/${projectId}/visits`);
  }

  if (isLoading) {
    return (
      <div
        className="flex h-64 items-center justify-center"
        role="status"
        aria-live="polite"
        aria-label="진단 목록을 불러오는 중"
      >
        <Loader2 className="h-8 w-8 animate-spin text-brand-point-500" aria-hidden="true" />
        <span className="sr-only">진단 목록을 불러오는 중입니다</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-red-500">진단 목록을 불러오는데 실패했어요</p>
        <Button onClick={() => window.location.reload()}>다시 시도</Button>
      </div>
    );
  }

  const diagnoses = data?.data || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-slate-400" />
            AI 진단 목록
          </CardTitle>
          <Button onClick={handleRequestDiagnosis}>
            <Camera className="h-4 w-4" />
            방문에서 진단 요청하기
          </Button>
        </CardHeader>
        <CardContent>
          {diagnoses.length === 0 ? (
            <div className="py-16 text-center">
              <Sparkles className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 text-slate-500">
                아직 AI 진단 기록이 없습니다.
              </p>
              <p className="mt-1 text-sm text-slate-400">
                현장 방문 후 AI 진단을 요청해 보세요.
              </p>
              <Button className="mt-6" onClick={handleRequestDiagnosis}>
                <Plus className="h-4 w-4" />
                첫 진단 요청하기
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                    <th className="pb-3 font-medium">진단 ID</th>
                    <th className="pb-3 font-medium">상태</th>
                    <th className="pb-3 font-medium">진단 내용</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {diagnoses.map((diagnosis, index) => {
                    const statusInfo = statusConfig[diagnosis.status];
                    return (
                      <tr
                        key={diagnosis.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >
                        <td className="py-4 font-medium text-slate-900">
                          진단 #{diagnoses.length - index}
                        </td>
                        <td className="py-4">
                          <Badge
                            variant={statusInfo.variant}
                            className="flex w-fit items-center gap-1"
                            aria-label={`상태: ${statusInfo.label}`}
                          >
                            <span aria-hidden="true">{statusInfo.icon}</span>
                            {statusInfo.label}
                          </Badge>
                          {diagnosis.status === "processing" && (
                            <span className="sr-only" role="status" aria-live="polite">
                              AI가 진단을 분석 중입니다
                            </span>
                          )}
                        </td>
                        <td className="py-4 text-slate-500">
                          {diagnosis.status === "completed" &&
                          diagnosis.leak_opinion_text ? (
                            <div className="max-w-md text-sm">
                              {diagnosis.leak_opinion_text.length > 50
                                ? `${diagnosis.leak_opinion_text.slice(0, 50)}...`
                                : diagnosis.leak_opinion_text}
                            </div>
                          ) : diagnosis.status === "processing" ? (
                            <span className="text-slate-400">분석 중...</span>
                          ) : diagnosis.status === "failed" ? (
                            <span className="text-red-500">
                              진단에 실패했습니다
                            </span>
                          ) : (
                            <span className="text-slate-400">대기 중</span>
                          )}
                        </td>
                        <td className="py-4">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleViewDiagnosis(diagnosis.id)}
                          >
                            <span>상세보기</span>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {diagnoses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-slate-400" />
              진단 통계
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm text-slate-500">총 진단 횟수</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {diagnoses.length}건
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm text-slate-500">완료</p>
                <p className="mt-2 text-2xl font-bold text-green-600">
                  {
                    diagnoses.filter((d) => d.status === "completed")
                      .length
                  }건
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm text-slate-500">처리 중</p>
                <p className="mt-2 text-2xl font-bold text-blue-600">
                  {
                    diagnoses.filter((d) => d.status === "processing")
                      .length
                  }건
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm text-slate-500">실패</p>
                <p className="mt-2 text-2xl font-bold text-red-600">
                  {
                    diagnoses.filter((d) => d.status === "failed")
                      .length
                  }건
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
