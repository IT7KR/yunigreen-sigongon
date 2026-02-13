"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  FileText,
  Check,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  PrimitiveButton,
  Badge,
  toast,
} from "@sigongon/ui";
import { useDiagnosis } from "@/hooks";
import { api } from "@/lib/api";
import type { DiagnosisStatus } from "@sigongon/types";

interface DiagnosisDetailPageProps {
  params: Promise<{ id: string }>;
}

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
    icon: <Sparkles className="h-4 w-4 animate-pulse" />,
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

export default function DiagnosisDetailPage({
  params,
}: DiagnosisDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading, error, refetch } = useDiagnosis(id);
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(
    new Set(),
  );
  const [isCreatingEstimate, setIsCreatingEstimate] = useState(false);
  const [fieldOpinion, setFieldOpinion] = useState("");
  const [isSavingFieldOpinion, setIsSavingFieldOpinion] = useState(false);

  const diagnosis = data?.data;

  useEffect(() => {
    setFieldOpinion(diagnosis?.field_opinion_text || "");
  }, [diagnosis?.id, diagnosis?.field_opinion_text]);

  const handleToggleMaterial = (materialId: string) => {
    setSelectedMaterials((prev) => {
      const next = new Set(prev);
      if (next.has(materialId)) {
        next.delete(materialId);
      } else {
        next.add(materialId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!diagnosis?.suggested_materials) return;

    if (selectedMaterials.size === diagnosis.suggested_materials.length) {
      setSelectedMaterials(new Set());
    } else {
      setSelectedMaterials(
        new Set(diagnosis.suggested_materials.map((m) => m.id)),
      );
    }
  };

  const handleCreateEstimate = async () => {
    if (!diagnosis?.project_id) {
      console.error("프로젝트 ID를 찾을 수 없어요");
      return;
    }

    setIsCreatingEstimate(true);
    try {
      const result = await api.createEstimate(diagnosis.project_id, id);
      if (result.success && result.data) {
        router.push(`/estimates/${result.data.id}`);
      }
    } catch (err) {
      console.error("견적서 생성 실패:", err);
      setIsCreatingEstimate(false);
    }
  };

  const handleSaveFieldOpinion = async () => {
    if (!diagnosis) return;

    try {
      setIsSavingFieldOpinion(true);
      const result = await api.updateDiagnosisFieldOpinion(
        diagnosis.id,
        { field_opinion_text: fieldOpinion.trim() },
      );

      if (result.success) {
        toast.success("현장 소견을 저장했어요.");
        await refetch();
      } else {
        toast.error(result.error?.message || "현장 소견 저장에 실패했어요.");
      }
    } catch (err) {
      console.error("현장 소견 저장 실패:", err);
      toast.error("현장 소견 저장에 실패했어요.");
    } finally {
      setIsSavingFieldOpinion(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Sparkles className="h-8 w-8 animate-pulse text-brand-point-500" />
            <p className="text-sm text-slate-500">진단 결과를 불러오는 중...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !diagnosis) {
    return (
      <AdminLayout>
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <XCircle className="h-12 w-12 text-red-400" />
          <p className="text-slate-500">진단 결과를 찾을 수 없어요</p>
          <Button variant="secondary" onClick={() => router.back()}>
            돌아가기
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const statusInfo = statusConfig[diagnosis.status];
  const isProcessing = diagnosis.status === "processing";
  const isCompleted = diagnosis.status === "completed";
  const hasMaterials =
    diagnosis.suggested_materials && diagnosis.suggested_materials.length > 0;

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            돌아가기
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">AI 진단 결과</h1>
            <p className="text-sm text-slate-500">
              {diagnosis.project_id && (
                <Link
                  href={`/projects/${diagnosis.project_id}`}
                  className="hover:text-brand-point-600 hover:underline"
                >
                  프로젝트로 이동
                </Link>
              )}
            </p>
          </div>
        </div>
        <Badge variant={statusInfo.variant} className="flex items-center gap-1">
          {statusInfo.icon}
          {statusInfo.label}
        </Badge>
      </div>

      <div className="space-y-6">
        {isProcessing && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="flex items-center gap-3 p-6">
              <Sparkles className="h-6 w-6 animate-pulse text-blue-500" />
              <div>
                <p className="font-medium text-blue-900">
                  AI가 사진을 분석하고 있어요
                </p>
                <p className="text-sm text-blue-700">
                  잠시만 기다려 주세요. 보통 30초 정도 걸려요.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {isCompleted && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-brand-point-600" />
                  누수 소견서
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-slate-50 p-6">
                  <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
                    {diagnosis.leak_opinion_text}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>현장 소견 (수기)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <textarea
                  value={fieldOpinion}
                  onChange={(event) => setFieldOpinion(event.target.value)}
                  placeholder="현장 확인 결과를 수기로 보완해 주세요."
                  rows={5}
                  className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-700 focus:border-brand-point-500 focus:outline-none focus:ring-2 focus:ring-brand-point-200"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveFieldOpinion}
                    disabled={isSavingFieldOpinion}
                    variant="secondary"
                  >
                    {isSavingFieldOpinion ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      "현장 소견 저장"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {hasMaterials && (
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-brand-point-600" />
                    추천 자재
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                    {selectedMaterials.size ===
                    diagnosis.suggested_materials.length
                      ? "전체 해제"
                      : "전체 선택"}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {diagnosis.suggested_materials.map((material) => (
                    <PrimitiveButton
                      type="button"
                      key={material.id}
                      className={`w-full cursor-pointer rounded-lg border p-4 text-left transition-colors ${
                        selectedMaterials.has(material.id)
                          ? "border-brand-point-500 bg-brand-point-50"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                      onClick={() => handleToggleMaterial(material.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900">
                              {material.suggested_name}
                            </p>
                            {material.match_confidence &&
                              material.match_confidence >= 0.8 && (
                                <Badge variant="success" className="text-xs">
                                  정확도 높음
                                </Badge>
                              )}
                          </div>
                          {material.suggested_spec && (
                            <p className="mt-1 text-sm text-slate-500">
                              {material.suggested_spec}
                            </p>
                          )}
                          <div className="mt-3 flex items-center gap-6 text-sm">
                            <span className="text-slate-600">
                              수량:{" "}
                              <strong className="text-slate-900">
                                {material.suggested_quantity}{" "}
                                {material.suggested_unit}
                              </strong>
                            </span>
                            {material.matched_catalog_item && (
                              <span className="font-medium text-brand-point-600">
                                단가:{" "}
                                {Number(
                                  material.matched_catalog_item.unit_price,
                                ).toLocaleString()}
                                원
                              </span>
                            )}
                          </div>
                        </div>
                        <div
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                            selectedMaterials.has(material.id)
                              ? "border-brand-point-500 bg-brand-point-500"
                              : "border-slate-300"
                          }`}
                        >
                          {selectedMaterials.has(material.id) && (
                            <Check className="h-4 w-4 text-white" />
                          )}
                        </div>
                      </div>

                      {!material.matched_catalog_item && (
                        <div className="mt-3 flex items-center gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          적산 자료에서 자재를 찾지 못했어요. 수동으로 추가해
                          주세요.
                        </div>
                      )}
                    </PrimitiveButton>
                  ))}
                </CardContent>
              </Card>
            )}

            {diagnosis.processing_time_ms && (
              <p className="text-center text-sm text-slate-400">
                분석 소요 시간:{" "}
                {(diagnosis.processing_time_ms / 1000).toFixed(1)}초
              </p>
            )}

            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  if (diagnosis.project_id) {
                    router.push(`/projects/${diagnosis.project_id}`);
                  }
                }}
              >
                프로젝트로 돌아가기
              </Button>
              <Button
                disabled={selectedMaterials.size === 0 || isCreatingEstimate}
                onClick={handleCreateEstimate}
              >
                {isCreatingEstimate ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    선택한 자재로 견적서 만들기 ({selectedMaterials.size}개)
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {diagnosis.status === "failed" && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex flex-col items-center gap-4 p-8">
              <XCircle className="h-16 w-16 text-red-400" />
              <div className="text-center">
                <p className="text-lg font-medium text-red-900">
                  진단에 실패했어요
                </p>
                <p className="mt-2 text-sm text-red-700">
                  사진이 불명확하거나 누수 부위가 보이지 않을 수 있어요.
                  <br />더 선명한 사진으로 다시 시도해 주세요.
                </p>
              </div>
              <Button variant="secondary" onClick={() => router.back()}>
                돌아가서 다시 시도하기
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
