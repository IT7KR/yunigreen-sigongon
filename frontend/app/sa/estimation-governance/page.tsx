"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { api } from "@/lib/api";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmModal,
  FileUpload,
  Input,
  formatDate,
  toast,
} from "@sigongon/ui";
import type {
  EstimationGovernanceOverview,
  SeasonCategoryInfo,
  SeasonDocumentInfo,
  SeasonDocumentStatus,
  SeasonInfo,
} from "@sigongon/types";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FileSpreadsheet,
  Layers,
  Plus,
  RefreshCw,
} from "lucide-react";

const ESTIMATION_PURPOSE = "estimation" as const;
const DONE_DOCUMENT_LABEL = "인덱싱 완료 문서";

const STEPS = [
  { id: 1, label: "요약" },
  { id: 2, label: "시즌" },
  { id: 3, label: "적산 문서" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const STEP_DESCRIPTIONS: Record<StepId, string> = {
  1: "현재 반영 상태를 확인하고 문제를 먼저 파악합니다.",
  2: "견적에 반영할 시즌을 선택하거나 신규 시즌을 생성합니다.",
  3: "PDF 문서를 첨부하고 인덱싱 상태를 관리합니다.",
};

const DOC_STATUS_CONFIG: Record<
  SeasonDocumentStatus,
  {
    label: string;
    variant: "default" | "success" | "warning" | "error" | "info";
  }
> = {
  queued: { label: "대기", variant: "default" },
  running: { label: "인덱싱 중", variant: "info" },
  done: { label: "인덱싱 완료", variant: "success" },
  failed: { label: "실패", variant: "error" },
};

type PendingAction =
  | { type: "activate-season"; season: SeasonInfo }
  | {
      type: "toggle-document";
      document: SeasonDocumentInfo;
      nextEnabled: boolean;
      doneEnabledDocumentCount: number;
      enabledDocumentCount: number;
    }
  | null;

function resolvePendingActionConfig(pendingAction: PendingAction) {
  if (!pendingAction) return null;

  if (pendingAction.type === "activate-season") {
    return {
      title: `${pendingAction.season.name} 시즌을 활성화할까요?`,
      description:
        "활성 시즌 전환 즉시 견적 반영 세트가 바뀌어요. 전환 후에는 해당 시즌의 활성 문서 분류 + 인덱싱 완료된 활성 문서만 견적에 사용됩니다.",
      confirmLabel: "시즌 활성화",
      variant: "default" as const,
    };
  }

  const isDisabling = !pendingAction.nextEnabled;
  const isLastEnabledDocument =
    isDisabling && pendingAction.enabledDocumentCount <= 1;
  const isLastDoneDocument =
    isDisabling && pendingAction.doneEnabledDocumentCount <= 1;
  let description = "문서 상태 변경은 즉시 견적 반영 세트에 적용돼요.";

  if (isLastEnabledDocument) {
    description =
      "마지막 활성 문서를 비활성화하면 견적 반영 세트가 비어져 견적 생성이 중단돼요.";
  } else if (isLastDoneDocument) {
    description =
      "인덱싱 완료된 활성 문서가 없어져 견적 생성이 중단될 수 있어요.";
  }

  return {
    title: `문서를 ${pendingAction.nextEnabled ? "활성화" : "비활성화"}할까요?`,
    description,
    confirmLabel: pendingAction.nextEnabled ? "활성화" : "비활성화",
    variant: isDisabling ? ("destructive" as const) : ("default" as const),
  };
}

function deriveTitleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "");
  return base.replace(/[_-]+/g, " ").trim() || "적산 자료";
}

export default function SAEstimationGovernancePage() {
  const [seasons, setSeasons] = useState<SeasonInfo[]>([]);
  const [overview, setOverview] = useState<EstimationGovernanceOverview | null>(
    null,
  );
  const [categories, setCategories] = useState<SeasonCategoryInfo[]>([]);
  const [documents, setDocuments] = useState<SeasonDocumentInfo[]>([]);

  const [activeStep, setActiveStep] = useState<StepId>(1);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);

  const [newSeasonName, setNewSeasonName] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [selectedDocumentFile, setSelectedDocumentFile] = useState<File | null>(
    null,
  );
  const [fileUploadResetKey, setFileUploadResetKey] = useState(0);

  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isScopedLoading, setIsScopedLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreatingSeason, setIsCreatingSeason] = useState(false);
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isWarningsExpanded, setIsWarningsExpanded] = useState(false);

  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const pendingActionConfig = useMemo(
    () => resolvePendingActionConfig(pendingAction),
    [pendingAction],
  );

  useEffect(() => {
    void bootstrap();
  }, []);

  const seasonNameMap = useMemo(() => {
    return new Map(seasons.map((season) => [season.id, season.name]));
  }, [seasons]);

  const enabledCategoryCount = categories.filter(
    (category) => category.is_enabled,
  ).length;
  const enabledDocumentCount = documents.filter(
    (document) => document.is_enabled,
  ).length;
  const doneEnabledDocumentCount = documents.filter(
    (document) => document.is_enabled && document.status === "done",
  ).length;

  const selectedSeason =
    seasons.find((season) => season.id === selectedSeasonId) || null;
  const overviewDoneEnabledDocuments = (
    overview?.enabled_documents || []
  ).filter((document) => document.status === "done");
  const hasActiveSeason = Boolean(overview?.active_season);
  const isEstimateReady =
    hasActiveSeason &&
    overviewDoneEnabledDocuments.length > 0 &&
    (overview?.effective_cost_item_count || 0) > 0;
  const readinessReason =
    overview?.health_warnings[0]?.message ||
    (!hasActiveSeason
      ? "활성 시즌이 없어요."
      : overviewDoneEnabledDocuments.length === 0
        ? "활성 상태의 인덱싱 완료 문서가 없어요."
        : (overview?.effective_cost_item_count || 0) === 0
          ? "반영 가능한 적산 항목이 없어요."
          : "현재 견적 반영 세트가 정상 상태입니다.");

  async function bootstrap() {
    setIsBootLoading(true);
    try {
      await refreshContext();
    } finally {
      setIsBootLoading(false);
    }
  }

  async function refreshContext(preferredSeasonId?: number | null) {
    setIsRefreshing(true);
    try {
      const [seasonRes, overviewRes] = await Promise.all([
        api.getSeasons(),
        api.getEstimationGovernanceOverview(),
      ]);

      const nextSeasons =
        seasonRes.success && seasonRes.data ? seasonRes.data : [];
      const nextOverview =
        overviewRes.success && overviewRes.data ? overviewRes.data : null;
      setSeasons(nextSeasons);
      setOverview(nextOverview);

      const resolvedSeasonId =
        preferredSeasonId ??
        selectedSeasonId ??
        nextOverview?.active_season?.id ??
        nextSeasons[0]?.id ??
        null;

      if (resolvedSeasonId === null) {
        setSelectedSeasonId(null);
        setCategories([]);
        setDocuments([]);
        return;
      }

      setSelectedSeasonId(resolvedSeasonId);
      await loadSeasonScoped(resolvedSeasonId);
    } catch (err) {
      console.error("적산 운영 데이터를 불러오지 못했습니다:", err);
      toast.error("적산 운영 데이터를 불러오지 못했어요.");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function loadSeasonScoped(targetSeasonId: number) {
    setIsScopedLoading(true);
    try {
      const [categoryRes, documentRes] = await Promise.all([
        api.getAdminSeasonCategories({
          season_id: targetSeasonId,
          purpose: ESTIMATION_PURPOSE,
        }),
        api.getAdminDocuments({
          season_id: targetSeasonId,
          purpose: ESTIMATION_PURPOSE,
        }),
      ]);

      const nextCategories =
        categoryRes.success && categoryRes.data ? categoryRes.data : [];
      const nextDocuments =
        documentRes.success && documentRes.data ? documentRes.data : [];
      setCategories(nextCategories);
      setDocuments(nextDocuments);
    } catch (err) {
      console.error("시즌 상세 데이터를 불러오지 못했습니다:", err);
      toast.error("선택한 시즌의 상세 데이터를 불러오지 못했어요.");
      setCategories([]);
      setDocuments([]);
    } finally {
      setIsScopedLoading(false);
    }
  }

  async function handleSelectSeason(nextSeasonId: number) {
    setSelectedSeasonId(nextSeasonId);
    await loadSeasonScoped(nextSeasonId);
  }

  async function handleCreateSeason() {
    if (!newSeasonName.trim()) {
      toast.error("시즌 이름을 입력해 주세요.");
      return;
    }

    setIsCreatingSeason(true);
    try {
      const response = await api.createSeason({
        name: newSeasonName.trim(),
        is_active: false,
      });
      if (!response.success || !response.data) {
        toast.error(response.error?.message || "시즌을 생성하지 못했어요.");
        return;
      }

      setNewSeasonName("");
      toast.success("시즌을 생성했어요.");
      setActiveStep(2);
      await refreshContext(response.data.id);
    } catch (err) {
      console.error("시즌 생성 실패:", err);
      toast.error("시즌 생성 중 오류가 발생했어요.");
    } finally {
      setIsCreatingSeason(false);
    }
  }

  function openActivateSeasonDialog(season: SeasonInfo) {
    setPendingAction({ type: "activate-season", season });
  }

  function openToggleDocumentDialog(document: SeasonDocumentInfo) {
    setPendingAction({
      type: "toggle-document",
      document,
      nextEnabled: !document.is_enabled,
      enabledDocumentCount,
      doneEnabledDocumentCount,
    });
  }

  function handleSelectDocumentFiles(files: File[]) {
    const first = files[0] || null;
    setSelectedDocumentFile(first);
    if (first && !docTitle.trim()) {
      setDocTitle(deriveTitleFromFileName(first.name));
    }
  }

  async function handleUploadDocument() {
    if (!selectedSeasonId) {
      toast.error("시즌을 선택해 주세요.");
      return;
    }
    if (!selectedDocumentFile) {
      toast.error("업로드할 PDF 파일을 선택해 주세요.");
      return;
    }

    setIsCreatingDocument(true);
    try {
      const uploadRes = await api.uploadAdminDocumentFile({
        season_id: selectedSeasonId,
        title:
          docTitle.trim() || deriveTitleFromFileName(selectedDocumentFile.name),
        file: selectedDocumentFile,
      });

      if (!uploadRes.success || !uploadRes.data) {
        toast.error(uploadRes.error?.message || "문서 업로드에 실패했어요.");
        return;
      }

      const ingestRes = await api.ingestAdminDocument(uploadRes.data.id);
      if (!ingestRes.success) {
        toast.error(ingestRes.error?.message || "인덱싱 시작에 실패했어요.");
        return;
      }

      toast.success("문서를 첨부하고 인덱싱을 시작했어요.");
      setDocTitle("");
      setSelectedDocumentFile(null);
      setFileUploadResetKey((prev) => prev + 1);
      await refreshContext(selectedSeasonId);
    } catch (err) {
      console.error("문서 업로드/인덱싱 실패:", err);
      toast.error("문서 업로드 중 오류가 발생했어요.");
    } finally {
      setIsCreatingDocument(false);
    }
  }

  async function handleConfirmPendingAction() {
    if (!pendingAction) return;

    setIsActionLoading(true);
    try {
      if (pendingAction.type === "activate-season") {
        const response = await api.updateSeason(pendingAction.season.id, {
          is_active: true,
        });
        if (!response.success) {
          toast.error(response.error?.message || "시즌 활성화에 실패했어요.");
          return;
        }
        toast.success("시즌을 활성화했어요.");
        await refreshContext(pendingAction.season.id);
      } else {
        const response = await api.updateAdminDocument(
          pendingAction.document.id,
          {
            is_enabled: pendingAction.nextEnabled,
          },
        );
        if (!response.success) {
          toast.error(
            response.error?.message || "문서 상태 변경에 실패했어요.",
          );
          return;
        }
        toast.success(
          `문서를 ${pendingAction.nextEnabled ? "활성화" : "비활성화"}했어요.`,
        );
        await refreshContext(selectedSeasonId);
      }

      setPendingAction(null);
    } catch (err) {
      console.error("상태 변경 실패:", err);
      toast.error("상태 변경 중 오류가 발생했어요.");
    } finally {
      setIsActionLoading(false);
    }
  }

  function moveStep(target: StepId) {
    setActiveStep(target);
  }

  const statusSummaryCard = (
    <Card className="lg:sticky lg:top-6">
      <CardHeader>
        <CardTitle>현재 반영 상태</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div
          className={
            isEstimateReady
              ? "rounded-lg border border-green-200 bg-green-50 p-3"
              : "rounded-lg border border-amber-200 bg-amber-50 p-3"
          }
        >
          <p
            className={
              isEstimateReady
                ? "text-xs font-semibold text-green-900"
                : "text-xs font-semibold text-amber-900"
            }
          >
            {isEstimateReady ? "견적 반영 가능" : "견적 반영 점검 필요"}
          </p>
          <p
            className={
              isEstimateReady
                ? "mt-1 text-xs text-green-800"
                : "mt-1 text-xs text-amber-900"
            }
          >
            {readinessReason}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 p-3">
          <p className="text-xs text-slate-500">선택된 시즌</p>
          <p className="mt-1 font-medium text-slate-900">
            {selectedSeason?.name || "없음"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="flex items-center gap-2 text-slate-900">
            <Layers className="h-4 w-4 text-slate-500" />
            <span>활성 문서 분류 {enabledCategoryCount}개</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-slate-900">
            <FileSpreadsheet className="h-4 w-4 text-slate-500" />
            <span>활성 문서 {enabledDocumentCount}개</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-slate-900">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>
              {DONE_DOCUMENT_LABEL} {doneEnabledDocumentCount}개
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">적산 운영</h1>
            <p className="mt-1 text-sm text-slate-600">
              활성 시즌 + 활성 문서 분류 + 인덱싱 완료된 활성 문서 조합이 현재
              견적 반영 세트입니다.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void refreshContext(selectedSeasonId)}
            loading={isRefreshing}
          >
            <RefreshCw className="h-4 w-4" />
            새로고침
          </Button>
        </div>

        <Card>
          <CardContent className="p-3">
            <div
              className={
                isEstimateReady
                  ? "mb-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2"
                  : "mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
              }
            >
              <p
                className={
                  isEstimateReady
                    ? "text-xs font-semibold text-green-900"
                    : "text-xs font-semibold text-amber-900"
                }
              >
                {isEstimateReady ? "견적 반영 가능" : "견적 반영 점검 필요"}
              </p>
              <p
                className={
                  isEstimateReady
                    ? "text-xs text-green-800"
                    : "text-xs text-amber-900"
                }
              >
                {readinessReason}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-xs text-slate-500">활성 시즌</p>
                <p className="text-sm font-semibold text-slate-900">
                  {overview?.active_season?.name || "없음"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-xs text-slate-500">반영 문서(인덱싱 완료)</p>
                <p className="text-sm font-semibold text-slate-900">
                  {overviewDoneEnabledDocuments.length.toLocaleString()}개
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-xs text-slate-500">반영 적산 항목</p>
                <p className="text-sm font-semibold text-slate-900">
                  {(overview?.effective_cost_item_count || 0).toLocaleString()}
                  개
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {!!overview?.health_warnings.length && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="space-y-2 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-amber-900">
                    운영 경고 {overview.health_warnings.length}건
                  </p>
                  <p className="text-xs text-amber-900">
                    {overview.health_warnings[0].message}
                  </p>
                </div>
                {overview.health_warnings.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsWarningsExpanded((prev) => !prev)}
                  >
                    {isWarningsExpanded ? "접기" : "더보기"}
                  </Button>
                )}
              </div>
              {isWarningsExpanded && overview.health_warnings.length > 1 && (
                <div className="space-y-1 pl-6">
                  {overview.health_warnings.slice(1).map((warning) => (
                    <p key={warning.code} className="text-xs text-amber-900">
                      • {warning.message}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isBootLoading ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-slate-500">불러오는 중...</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-8">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>운영 단계</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <div className="flex min-w-max gap-2">
                      {STEPS.map((step) => (
                        <Button
                          key={step.id}
                          size="sm"
                          variant={
                            activeStep === step.id ? "primary" : "outline"
                          }
                          onClick={() => moveStep(step.id)}
                          className="min-h-12 min-w-[7rem]"
                        >
                          {step.id}. {step.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    현재 단계 {activeStep}/3 · {STEP_DESCRIPTIONS[activeStep]}
                  </p>
                </CardContent>
              </Card>

              <div className="lg:hidden">{statusSummaryCard}</div>

              {activeStep === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle>요약</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-slate-700">
                      현재 반영 규칙은{" "}
                      <strong>
                        활성 시즌 + 활성 문서 분류 + 인덱싱 완료된 활성 문서
                      </strong>{" "}
                      입니다.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-slate-200 p-3">
                        <p className="text-xs text-slate-500">선택된 시즌</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {selectedSeason?.name || "없음"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-3">
                        <p className="text-xs text-slate-500">활성 문서 분류/인덱싱 완료 문서</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {enabledCategoryCount}개 / {doneEnabledDocumentCount}
                          개
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button onClick={() => moveStep(2)}>
                        시즌 설정으로 이동
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" onClick={() => moveStep(3)}>
                        문서 첨부로 이동
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeStep === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle>시즌</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <Input
                        id="new-season-name"
                        name="newSeasonName"
                        autoComplete="off"
                        label="새 시즌명"
                        placeholder="예: 2026H2"
                        value={newSeasonName}
                        onChange={(event) =>
                          setNewSeasonName(event.target.value)
                        }
                      />
                      <Button
                        onClick={() => void handleCreateSeason()}
                        loading={isCreatingSeason}
                        className="min-h-12"
                      >
                        <Plus className="h-4 w-4" />
                        시즌 추가
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {seasons.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          등록된 시즌이 없어요.
                        </p>
                      ) : (
                        seasons.map((season) => (
                          <div
                            key={season.id}
                            className="rounded-lg border border-slate-200 p-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  void handleSelectSeason(season.id)
                                }
                                className="text-left"
                              >
                                <p className="text-sm font-medium text-slate-900">
                                  {season.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  생성: {formatDate(season.created_at)}
                                </p>
                              </button>
                              <Badge
                                variant={
                                  season.is_active ? "success" : "default"
                                }
                              >
                                {season.is_active ? "활성" : "비활성"}
                              </Badge>
                            </div>
                            {!season.is_active && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="mt-2"
                                onClick={() => openActivateSeasonDialog(season)}
                              >
                                활성화
                              </Button>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button variant="outline" onClick={() => moveStep(3)}>
                        다음: 적산 문서
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeStep === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle>적산 문서 (파일 첨부 기반)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label
                        htmlFor="document-season-select"
                        className="text-xs text-slate-500"
                      >
                        대상 시즌
                      </label>
                      <select
                        id="document-season-select"
                        name="documentSeason"
                        className="h-12 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
                        value={selectedSeasonId ?? ""}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          if (!value) return;
                          void handleSelectSeason(value);
                        }}
                      >
                        {seasons.map((season) => (
                          <option key={season.id} value={season.id}>
                            {season.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs text-slate-700">
                        문서는 선택한 시즌의 기본 문서 분류에 자동 등록됩니다.
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="mb-2 text-xs text-slate-500">PDF 첨부</p>
                      <FileUpload
                        key={fileUploadResetKey}
                        accept=".pdf,application/pdf"
                        maxSize={50 * 1024 * 1024}
                        multiple={false}
                        onFiles={handleSelectDocumentFiles}
                        disabled={isCreatingDocument}
                      />
                    </div>

                    <Input
                      id="document-title"
                      name="documentTitle"
                      autoComplete="off"
                      label="문서 제목 (선택)"
                      helperText="미입력 시 첨부 파일명으로 자동 설정됩니다."
                      value={docTitle}
                      onChange={(event) => setDocTitle(event.target.value)}
                    />

                    <Button
                      onClick={() => void handleUploadDocument()}
                      loading={isCreatingDocument}
                      disabled={!selectedSeasonId || !selectedDocumentFile}
                      className="min-h-12 w-full"
                    >
                      문서 첨부 + 인덱싱 시작
                    </Button>

                    <div className="space-y-2">
                      {isScopedLoading ? (
                        <p className="text-sm text-slate-500">불러오는 중...</p>
                      ) : documents.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          등록된 문서가 없어요.
                        </p>
                      ) : (
                        documents.map((document) => {
                          const statusConfig =
                            DOC_STATUS_CONFIG[document.status];
                          return (
                            <div
                              key={document.id}
                              className="rounded-lg border border-slate-200 p-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <p className="text-sm font-medium text-slate-900">
                                    {document.title}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {seasonNameMap.get(document.season_id) ||
                                      document.season_id}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Badge variant={statusConfig.variant}>
                                    {statusConfig.label}
                                  </Badge>
                                  <Badge
                                    variant={
                                      document.is_enabled
                                        ? "success"
                                        : "default"
                                    }
                                  >
                                    {document.is_enabled ? "반영" : "미반영"}
                                  </Badge>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant={
                                  document.is_enabled ? "outline" : "secondary"
                                }
                                className="mt-2"
                                onClick={() =>
                                  openToggleDocumentDialog(document)
                                }
                              >
                                {document.is_enabled ? "비활성화" : "활성화"}
                              </Button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="hidden space-y-4 lg:col-span-4 lg:block">
              {statusSummaryCard}
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={Boolean(pendingAction)}
        onClose={() => setPendingAction(null)}
        onConfirm={() => void handleConfirmPendingAction()}
        title={pendingActionConfig?.title || ""}
        description={pendingActionConfig?.description}
        confirmLabel={pendingActionConfig?.confirmLabel || "확인"}
        variant={pendingActionConfig?.variant || "default"}
        loading={isActionLoading}
      />
    </AdminLayout>
  );
}
