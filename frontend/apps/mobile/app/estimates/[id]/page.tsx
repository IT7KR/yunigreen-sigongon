"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Send,
  Download,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  FileSignature,
} from "lucide-react";
import { MobileLayout } from "@/components/MobileLayout";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, LoadingOverlay, PrimitiveButton, formatCurrency, toast, useConfirmDialog } from "@sigongon/ui";
import {
  useEstimate,
  useIssueEstimate,
  useDecideEstimate,
  useUpdateEstimateLine,
  useDeleteEstimateLine,
  useAddEstimateLine,
  useCreateContract,
} from "@/hooks";
import type {
  EstimateDetail,
  EstimateStatus,
  EstimateLineSource,
} from "@sigongon/types";
import { VoiceInput } from "@/components/features/VoiceInput";
import { RAGSearchDrawer } from "@/components/features/RAGSearchDrawer";
import {
  MOBILE_MOCK_EXPORT_SAMPLE_FILES,
  buildSampleFileDownloadUrl,
} from "@/lib/sampleFiles";

interface EstimateDetailPageProps {
  params: Promise<{ id: string }>;
}

const statusConfig: Record<
  EstimateStatus,
  {
    label: string;
    variant: "default" | "success" | "warning" | "error" | "info";
  }
> = {
  draft: { label: "초안", variant: "default" },
  issued: { label: "발행됨", variant: "info" },
  accepted: { label: "수락됨", variant: "success" },
  rejected: { label: "거절됨", variant: "error" },
  void: { label: "무효", variant: "default" },
};

const sourceLabels: Record<EstimateLineSource, string> = {
  ai: "AI 추천",
  manual: "수동 입력",
  template: "템플릿",
};

interface EditingLine {
  id: string;
  quantity: string;
  unit_price_snapshot: string;
}

export default function EstimateDetailPage({
  params,
}: EstimateDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading, error } = useEstimate(id);
  const issueEstimate = useIssueEstimate(id);
  const decideEstimate = useDecideEstimate(id);
  const updateLine = useUpdateEstimateLine(id);
  const deleteLine = useDeleteEstimateLine(id);
  const addLine = useAddEstimateLine(id);
  const projectIdForEstimate =
    (
      data?.data as
        | (EstimateDetail & { project_id?: string })
        | undefined
    )?.project_id || "";
  const createContract = useCreateContract(projectIdForEstimate);
  const { confirm } = useConfirmDialog();

  const [editingLine, setEditingLine] = useState<EditingLine | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [ragDrawerOpen, setRagDrawerOpen] = useState(false);
  const [newLine, setNewLine] = useState({
    description: "",
    specification: "",
    unit: "개",
    quantity: "1",
    unit_price_snapshot: "0",
  });

  const estimate = data?.data;
  const isDraft = estimate?.status === "draft";
  const isIssued = estimate?.status === "issued";
  const isAccepted = estimate?.status === "accepted";

  const handleStartEdit = (line: {
    id: string;
    quantity: string;
    unit_price_snapshot: string;
  }) => {
    setEditingLine({
      id: line.id,
      quantity: line.quantity,
      unit_price_snapshot: line.unit_price_snapshot,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingLine) return;

    await updateLine.mutateAsync({
      lineId: editingLine.id,
      data: {
        quantity: editingLine.quantity,
        unit_price_snapshot: editingLine.unit_price_snapshot,
      },
    });
    setEditingLine(null);
  };

  const handleCancelEdit = () => {
    setEditingLine(null);
  };

  const handleDeleteLine = async (lineId: string) => {
    const confirmed = await confirm({
      title: "이 항목을 삭제할까요?",
      description: "삭제 후에는 복구할 수 없습니다.",
      confirmLabel: "삭제",
      variant: "destructive",
    });
    if (!confirmed) return;
    await deleteLine.mutateAsync(lineId);
  };

  const handleAddLine = async () => {
    if (!newLine.description.trim()) return;

    await addLine.mutateAsync({
      description: newLine.description,
      specification: newLine.specification || undefined,
      unit: newLine.unit,
      quantity: newLine.quantity,
      unit_price_snapshot: newLine.unit_price_snapshot,
    });

    setNewLine({
      description: "",
      specification: "",
      unit: "개",
      quantity: "1",
      unit_price_snapshot: "0",
    });
    setShowAddForm(false);
  };

  const handleIssue = async () => {
    const confirmed = await confirm({
      title: "견적서를 발행할까요?",
      description: "발행 후에는 수정할 수 없습니다.",
      confirmLabel: "발행",
    });
    if (!confirmed) return;

    await issueEstimate.mutateAsync();
  };

  const handleDecision = async (action: "accepted" | "rejected") => {
    const isAcceptAction = action === "accepted";
    const confirmed = await confirm({
      title: isAcceptAction
        ? "고객 수락으로 처리할까요?"
        : "고객 미선정(거절)으로 처리할까요?",
      description: isAcceptAction
        ? "수락 처리 후 계약서를 생성할 수 있습니다."
        : "이 견적은 계약 대상으로 사용되지 않습니다.",
      confirmLabel: isAcceptAction ? "수락 처리" : "거절 처리",
      variant: isAcceptAction ? "default" : "destructive",
    });
    if (!confirmed) return;

    await decideEstimate.mutateAsync({ action });
  };

  const downloadSampleFile = (samplePath: string, fileName: string) => {
    const anchor = document.createElement("a");
    anchor.href = buildSampleFileDownloadUrl(samplePath);
    anchor.download = fileName;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  };

  const handleDownloadEstimate = () => {
    downloadSampleFile(
      MOBILE_MOCK_EXPORT_SAMPLE_FILES.estimateXlsx,
      "견적내역서_샘플.xlsx",
    );
  };

  const handleCreateContract = async () => {
    if (!estimate) return;
    if (estimate.status !== "accepted") {
      toast.warning("고객 수락된 견적서만 계약서를 만들 수 있어요.");
      return;
    }
    if (!projectIdForEstimate) {
      toast.error("프로젝트 정보가 없어 계약서를 생성할 수 없어요.");
      return;
    }

    const result = await createContract.mutateAsync({
      estimate_id: estimate.id,
    });

    if (!result.success || !result.data) {
      toast.error(result.error?.message || "계약서 생성에 실패했어요.");
      return;
    }

    toast.success(`계약서 초안을 생성했어요 (${result.data.contract_number}).`);
    router.push(`/projects/${projectIdForEstimate}`);
  };

  const handleAddRAGItem = async (item: {
    description: string;
    specification?: string;
    unit: string;
    quantity: string;
    unit_price_snapshot: string;
  }) => {
    await addLine.mutateAsync(item);
  };

  if (isLoading) {
    return (
      <MobileLayout title="견적서" showBack>
        <LoadingOverlay variant="inline" text="견적서를 불러오는 중..." />
      </MobileLayout>
    );
  }

  if (error || !estimate) {
    return (
      <MobileLayout title="견적서" showBack>
        <div className="flex h-64 flex-col items-center justify-center gap-4 p-4">
          <AlertCircle className="h-12 w-12 text-red-400" />
          <p className="text-slate-500">견적서를 찾을 수 없어요</p>
          <Button variant="secondary" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />돌아가기
          </Button>
        </div>
      </MobileLayout>
    );
  }

  const statusInfo = statusConfig[estimate.status];

  return (
    <MobileLayout
      title={`견적서 v${estimate.version}`}
      showBack
      rightAction={
        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      }
    >
      <div className="space-y-4 p-4 pb-nav-safe">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-brand-point-600" />
              견적 항목
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {estimate.lines.map((line) => (
              <div
                key={line.id}
                className="rounded-lg border border-slate-200 p-3"
              >
                {editingLine?.id === line.id ? (
                  <div className="space-y-3">
                    <p className="font-medium text-slate-900">
                      {line.description}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-500">수량</label>
                        <Input
                          type="number"
                          value={editingLine.quantity}
                          onChange={(e) =>
                            setEditingLine({
                              ...editingLine,
                              quantity: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">단가</label>
                        <Input
                          type="number"
                          value={editingLine.unit_price_snapshot}
                          onChange={(e) =>
                            setEditingLine({
                              ...editingLine,
                              unit_price_snapshot: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        loading={updateLine.isPending}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900">
                            {line.description}
                          </p>
                          <Badge variant="default" className="text-xs">
                            {sourceLabels[line.source]}
                          </Badge>
                        </div>
                        {line.specification && (
                          <p className="mt-0.5 text-sm text-slate-500">
                            {line.specification}
                          </p>
                        )}
                      </div>
                      {isDraft && (
                        <div className="flex gap-1">
                          <PrimitiveButton
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            onClick={() => handleStartEdit(line)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </PrimitiveButton>
                          <PrimitiveButton
                            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                            onClick={() => handleDeleteLine(line.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </PrimitiveButton>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-slate-500">
                        {line.quantity} {line.unit} ×{" "}
                        {formatCurrency(Number(line.unit_price_snapshot))}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(Number(line.amount))}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ))}

            {isDraft && !showAddForm && (
              <div className="space-y-2">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setRagDrawerOpen(true)}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI 검색
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setShowAddForm(true)}
                  className="border-dashed"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  항목 추가
                </Button>
              </div>
            )}

            {showAddForm && (
              <div className="rounded-lg border-2 border-dashed border-brand-point-200 bg-brand-point-50 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="항목명"
                    value={newLine.description}
                    onChange={(e) =>
                      setNewLine({ ...newLine, description: e.target.value })
                    }
                    className="flex-1"
                  />
                  <VoiceInput
                    onTranscript={(text) =>
                      setNewLine({ ...newLine, description: text })
                    }
                    placeholder="음성으로 입력"
                  />
                </div>
                <Input
                  placeholder="규격 (선택)"
                  value={newLine.specification}
                  onChange={(e) =>
                    setNewLine({ ...newLine, specification: e.target.value })
                  }
                />
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="단위"
                    value={newLine.unit}
                    onChange={(e) =>
                      setNewLine({ ...newLine, unit: e.target.value })
                    }
                  />
                  <Input
                    type="number"
                    placeholder="수량"
                    value={newLine.quantity}
                    onChange={(e) =>
                      setNewLine({ ...newLine, quantity: e.target.value })
                    }
                  />
                  <Input
                    type="number"
                    placeholder="단가"
                    value={newLine.unit_price_snapshot}
                    onChange={(e) =>
                      setNewLine({
                        ...newLine,
                        unit_price_snapshot: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddForm(false)}
                  >
                    <X className="h-3.5 w-3.5" />취소
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddLine}
                    loading={addLine.isPending}
                    disabled={!newLine.description.trim()}
                  >
                    <Plus className="h-3.5 w-3.5" />추가
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">소계</span>
                <span className="text-slate-900">
                  {formatCurrency(Number(estimate.subtotal))}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">부가세 (10%)</span>
                <span className="text-slate-900">
                  {formatCurrency(Number(estimate.vat_amount))}
                </span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-900">합계</span>
                  <span className="text-lg font-bold text-brand-point-600">
                    {formatCurrency(Number(estimate.total_amount))}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t bg-white p-4 pb-safe">
        {isDraft ? (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={handleDownloadEstimate}
            >
              <Download className="mr-2 h-4 w-4" />
              미리보기
            </Button>
            <Button
              className="flex-1"
              onClick={handleIssue}
              loading={issueEstimate.isPending}
            >
              <Send className="mr-2 h-4 w-4" />
              발행하기
            </Button>
          </div>
        ) : isIssued ? (
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              className="col-span-2"
              onClick={handleDownloadEstimate}
            >
              <Download className="mr-2 h-4 w-4" />
              견적서 다운로드
            </Button>
            <Button
              onClick={() => handleDecision("accepted")}
              loading={decideEstimate.isPending}
              disabled={decideEstimate.isPending}
            >
              <Check className="mr-2 h-4 w-4" />
              고객 수락
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDecision("rejected")}
              loading={decideEstimate.isPending}
              disabled={decideEstimate.isPending}
            >
              <X className="mr-2 h-4 w-4" />
              고객 미선정
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={handleDownloadEstimate}
            >
              <Download className="mr-2 h-4 w-4" />
              견적서 다운로드
            </Button>
            <Button
              className="flex-1"
              onClick={handleCreateContract}
              loading={createContract.isPending}
              disabled={createContract.isPending || !isAccepted}
            >
              <FileSignature className="h-4 w-4" />
              {isAccepted ? "계약서 만들기" : "계약 생성 불가"}
            </Button>
          </div>
        )}
      </div>

      <RAGSearchDrawer
        isOpen={ragDrawerOpen}
        onClose={() => setRagDrawerOpen(false)}
        onAddItem={handleAddRAGItem}
      />
    </MobileLayout>
  );
}
