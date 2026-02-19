"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  FileSpreadsheet,
  Layers,
  Plus,
  RefreshCw,
  Upload,
} from "lucide-react";

const ESTIMATION_PURPOSE = "estimation" as const;

const DOC_STATUS_CONFIG: Record<
  SeasonDocumentStatus,
  { label: string; variant: "default" | "success" | "warning" | "error" | "info" }
> = {
  queued: { label: "대기", variant: "default" },
  running: { label: "인덱싱중", variant: "info" },
  done: { label: "준비완료", variant: "success" },
  failed: { label: "실패", variant: "error" },
};

type PendingAction =
  | { type: "activate-season"; season: SeasonInfo }
  | {
      type: "toggle-category";
      category: SeasonCategoryInfo;
      nextEnabled: boolean;
      enabledCategoryCount: number;
    }
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
        "활성 시즌 전환 즉시 견적 반영 세트가 바뀌어요. 전환 후에는 해당 시즌의 활성 카테고리 + 활성 문서(done)만 견적에 사용됩니다.",
      confirmLabel: "시즌 활성화",
      variant: "default" as const,
    };
  }

  if (pendingAction.type === "toggle-category") {
    const isDisabling = !pendingAction.nextEnabled;
    const isLastEnabled = isDisabling && pendingAction.enabledCategoryCount <= 1;
    return {
      title: `카테고리를 ${pendingAction.nextEnabled ? "활성화" : "비활성화"}할까요?`,
      description: isLastEnabled
        ? "마지막 활성 카테고리를 비활성화하면 견적 반영 세트가 비어 견적 생성이 중단돼요."
        : "카테고리 상태 변경은 즉시 견적 반영 세트에 적용돼요.",
      confirmLabel: pendingAction.nextEnabled ? "활성화" : "비활성화",
      variant: isDisabling ? ("destructive" as const) : ("default" as const),
    };
  }

  const isDisabling = !pendingAction.nextEnabled;
  const isLastEnabledDocument = isDisabling && pendingAction.enabledDocumentCount <= 1;
  const isLastDoneDocument = isDisabling && pendingAction.doneEnabledDocumentCount <= 1;
  let description = "문서 상태 변경은 즉시 견적 반영 세트에 적용돼요.";

  if (isLastEnabledDocument) {
    description = "마지막 활성 문서를 비활성화하면 견적 반영 세트가 비어져 견적 생성이 중단돼요.";
  } else if (isLastDoneDocument) {
    description = "인덱싱 완료된 활성 문서가 없어져 견적 생성이 중단될 수 있어요.";
  }

  return {
    title: `문서를 ${pendingAction.nextEnabled ? "활성화" : "비활성화"}할까요?`,
    description,
    confirmLabel: pendingAction.nextEnabled ? "활성화" : "비활성화",
    variant: isDisabling ? ("destructive" as const) : ("default" as const),
  };
}

export default function SAEstimationGovernancePage() {
  const [seasons, setSeasons] = useState<SeasonInfo[]>([]);
  const [overview, setOverview] = useState<EstimationGovernanceOverview | null>(null);
  const [categories, setCategories] = useState<SeasonCategoryInfo[]>([]);
  const [documents, setDocuments] = useState<SeasonDocumentInfo[]>([]);

  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const [newSeasonName, setNewSeasonName] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [fileName, setFileName] = useState("season-pricebook.pdf");

  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isScopedLoading, setIsScopedLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreatingSeason, setIsCreatingSeason] = useState(false);
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

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

  const enabledCategoryCount = categories.filter((category) => category.is_enabled).length;
  const enabledDocumentCount = documents.filter((document) => document.is_enabled).length;
  const doneEnabledDocumentCount = documents.filter(
    (document) => document.is_enabled && document.status === "done",
  ).length;

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

      const nextSeasons = seasonRes.success && seasonRes.data ? seasonRes.data : [];
      const nextOverview = overviewRes.success && overviewRes.data ? overviewRes.data : null;
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
        setSelectedCategoryId(null);
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

      const nextCategories = categoryRes.success && categoryRes.data ? categoryRes.data : [];
      const nextDocuments = documentRes.success && documentRes.data ? documentRes.data : [];
      setCategories(nextCategories);
      setDocuments(nextDocuments);
      setSelectedCategoryId((prev) => {
        if (prev && nextCategories.some((category) => category.id === prev)) {
          return prev;
        }
        return nextCategories[0]?.id ?? null;
      });
    } catch (err) {
      console.error("시즌 상세 데이터를 불러오지 못했습니다:", err);
      toast.error("선택한 시즌의 상세 데이터를 불러오지 못했어요.");
      setCategories([]);
      setDocuments([]);
      setSelectedCategoryId(null);
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

  function openToggleCategoryDialog(category: SeasonCategoryInfo) {
    setPendingAction({
      type: "toggle-category",
      category,
      nextEnabled: !category.is_enabled,
      enabledCategoryCount,
    });
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

  async function handleCreateDocument() {
    if (!selectedSeasonId) {
      toast.error("시즌을 선택해 주세요.");
      return;
    }
    if (!selectedCategoryId) {
      toast.error("카테고리를 선택해 주세요.");
      return;
    }
    if (!docTitle.trim() || !fileName.trim()) {
      toast.error("문서 제목과 파일명을 입력해 주세요.");
      return;
    }

    setIsCreatingDocument(true);
    try {
      const createRes = await api.createAdminDocument({
        season_id: selectedSeasonId,
        category_id: selectedCategoryId,
        title: docTitle.trim(),
        file_name: fileName.trim(),
      });
      if (!createRes.success || !createRes.data) {
        toast.error(createRes.error?.message || "문서 등록에 실패했어요.");
        return;
      }

      const ingestRes = await api.ingestAdminDocument(createRes.data.id);
      if (!ingestRes.success) {
        toast.error(ingestRes.error?.message || "인덱싱 시작에 실패했어요.");
        return;
      }

      toast.success("문서를 등록하고 인덱싱을 시작했어요.");
      setDocTitle("");
      await refreshContext(selectedSeasonId);
    } catch (err) {
      console.error("문서 등록/인덱싱 실패:", err);
      toast.error("문서 등록 중 오류가 발생했어요.");
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
      } else if (pendingAction.type === "toggle-category") {
        const response = await api.updateAdminSeasonCategory(
          pendingAction.category.id,
          { is_enabled: pendingAction.nextEnabled },
        );
        if (!response.success) {
          toast.error(response.error?.message || "카테고리 상태 변경에 실패했어요.");
          return;
        }
        toast.success(
          `카테고리를 ${pendingAction.nextEnabled ? "활성화" : "비활성화"}했어요.`,
        );
        await refreshContext(selectedSeasonId);
      } else {
        const response = await api.updateAdminDocument(pendingAction.document.id, {
          is_enabled: pendingAction.nextEnabled,
        });
        if (!response.success) {
          toast.error(response.error?.message || "문서 상태 변경에 실패했어요.");
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

  const overviewDoneEnabledDocuments = (overview?.enabled_documents ?? []).filter(
    (document) => document.status === "done",
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">적산 운영</h1>
            <p className="mt-1 text-sm text-slate-500">
              활성 시즌 + 활성 카테고리 + 활성 문서(done) 조합이 현재 견적 반영 세트입니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => void refreshContext(selectedSeasonId)}
              loading={isRefreshing}
            >
              <RefreshCw className="h-4 w-4" />
              새로고침
            </Button>
            <Button asChild>
              <Link href="/sa/pricebooks/upload">
                <Upload className="h-4 w-4" />
                새 적산 PDF 업로드
              </Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>현재 견적 반영 세트</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-500">활성 시즌</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {overview?.active_season?.name || "없음"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-500">활성 카테고리</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {(overview?.enabled_categories.length || 0).toLocaleString()}개
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-500">활성 문서(done)</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {overviewDoneEnabledDocuments.length.toLocaleString()}개
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-500">반영 적산 항목</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {(overview?.effective_cost_item_count || 0).toLocaleString()}개
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isBootLoading ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-slate-500">불러오는 중...</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 xl:grid-cols-12">
            <Card className="xl:col-span-3">
              <CardHeader>
                <CardTitle>시즌</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="예: 2026H2"
                    value={newSeasonName}
                    onChange={(event) => setNewSeasonName(event.target.value)}
                  />
                  <Button
                    size="sm"
                    onClick={() => void handleCreateSeason()}
                    loading={isCreatingSeason}
                  >
                    <Plus className="h-4 w-4" />
                    추가
                  </Button>
                </div>

                <div className="space-y-2">
                  {seasons.length === 0 ? (
                    <p className="text-sm text-slate-500">등록된 시즌이 없어요.</p>
                  ) : (
                    seasons.map((season) => (
                      <div
                        key={season.id}
                        className="rounded-lg border border-slate-200 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => void handleSelectSeason(season.id)}
                            className="text-left"
                          >
                            <p className="text-sm font-medium text-slate-900">{season.name}</p>
                            <p className="text-xs text-slate-500">
                              생성: {formatDate(season.created_at)}
                            </p>
                          </button>
                          <Badge variant={season.is_active ? "success" : "default"}>
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
              </CardContent>
            </Card>

            <Card className="xl:col-span-3">
              <CardHeader>
                <CardTitle>카테고리</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">대상 시즌</p>
                  <select
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
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

                {isScopedLoading ? (
                  <p className="text-sm text-slate-500">불러오는 중...</p>
                ) : categories.length === 0 ? (
                  <p className="text-sm text-slate-500">카테고리가 없어요.</p>
                ) : (
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        className="rounded-lg border border-slate-200 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{category.name}</p>
                            <p className="text-xs text-slate-500">
                              purpose: {category.purpose}
                            </p>
                          </div>
                          <Badge variant={category.is_enabled ? "success" : "default"}>
                            {category.is_enabled ? "활성" : "비활성"}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant={category.is_enabled ? "outline" : "secondary"}
                          className="mt-2"
                          onClick={() => openToggleCategoryDialog(category)}
                        >
                          {category.is_enabled ? "비활성화" : "활성화"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="xl:col-span-4">
              <CardHeader>
                <CardTitle>적산 문서</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <select
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900"
                    value={selectedCategoryId ?? ""}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setSelectedCategoryId(value || null);
                    }}
                  >
                    <option value="">카테고리 선택</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder="문서 제목"
                    value={docTitle}
                    onChange={(event) => setDocTitle(event.target.value)}
                  />
                  <Input
                    placeholder="파일명.pdf"
                    value={fileName}
                    onChange={(event) => setFileName(event.target.value)}
                  />
                  <Button
                    onClick={() => void handleCreateDocument()}
                    loading={isCreatingDocument}
                    disabled={!selectedSeasonId || !selectedCategoryId}
                  >
                    문서 등록 + 인덱싱
                  </Button>
                </div>

                {isScopedLoading ? (
                  <p className="text-sm text-slate-500">불러오는 중...</p>
                ) : documents.length === 0 ? (
                  <p className="text-sm text-slate-500">등록된 문서가 없어요.</p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((document) => {
                      const statusConfig = DOC_STATUS_CONFIG[document.status];
                      return (
                        <div
                          key={document.id}
                          className="rounded-lg border border-slate-200 p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-slate-900">{document.title}</p>
                              <p className="text-xs text-slate-500">
                                {seasonNameMap.get(document.season_id) || document.season_id} · {document.category}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                              <Badge variant={document.is_enabled ? "success" : "default"}>
                                {document.is_enabled ? "반영" : "미반영"}
                              </Badge>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <Button
                              size="sm"
                              variant={document.is_enabled ? "outline" : "secondary"}
                              onClick={() => openToggleDocumentDialog(document)}
                            >
                              {document.is_enabled ? "비활성화" : "활성화"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>영향도</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="font-medium text-slate-900">현재 조합</p>
                  <p className="mt-1 text-xs text-slate-600">
                    활성 시즌 + 활성 카테고리 + 활성 문서(done)
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-900">
                    <Layers className="h-4 w-4 text-slate-500" />
                    <span>활성 카테고리 {enabledCategoryCount}개</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-slate-900">
                    <FileSpreadsheet className="h-4 w-4 text-slate-500" />
                    <span>활성 문서 {enabledDocumentCount}개</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-slate-900">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>done 문서 {doneEnabledDocumentCount}개</span>
                  </div>
                </div>

                {overview?.health_warnings.length ? (
                  <div className="space-y-2">
                    {overview.health_warnings.map((warning) => (
                      <div
                        key={warning.code}
                        className="rounded-lg border border-amber-200 bg-amber-50 p-3"
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                          <p className="text-xs text-amber-900">{warning.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                      <p className="text-xs text-green-800">
                        현재 견적 반영 세트가 정상 상태입니다.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
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
